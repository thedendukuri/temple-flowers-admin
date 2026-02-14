import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

type OrderStatus = "Pending" | "Completed" | "Cancelled" | "Picked Up";

const statusColors: Record<OrderStatus, string> = {
  Pending: "bg-saffron/20 text-saffron-dark",
  Completed: "bg-success/20 text-success",
  Cancelled: "bg-destructive/20 text-destructive",
  "Picked Up": "bg-brown/20 text-brown",
};

const PAGE_SIZE = 10;

const Orders = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sortField, setSortField] = useState<"created_at" | "pickup_date">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [viewOrder, setViewOrder] = useState<any | null>(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flower_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("flower_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders-count"] });
      toast.success("Status updated");
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flower_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders-count"] });
      toast.success("Order deleted");
    },
  });

  // Filter & sort
  let filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || o.customer_name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.phone_number.includes(q);
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesDate = !dateFilter || o.pickup_date === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  filtered.sort((a, b) => {
    const aVal = sortField === "created_at" ? new Date(a.created_at).getTime() : new Date(a.pickup_date).getTime();
    const bVal = sortField === "created_at" ? new Date(b.created_at).getTime() : new Date(b.pickup_date).getTime();
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (field: "created_at" | "pickup_date") => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brown">Orders</h1>

      {/* Filters */}
      <Card className="bg-card shadow-sm">
        <CardContent className="flex flex-wrap gap-3 pt-4">
          <Input placeholder="Search name, email, phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="w-64 bg-background" />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40 bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
              <SelectItem value="Picked Up">Picked Up</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(0); }} className="w-44 bg-background" />
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card shadow-sm overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-brown">Customer</TableHead>
              <TableHead className="text-brown">Phone</TableHead>
              <TableHead className="cursor-pointer text-brown" onClick={() => toggleSort("pickup_date")}>
                Pickup Date {sortField === "pickup_date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead className="text-brown">Slot</TableHead>
              <TableHead className="text-brown">Status</TableHead>
              <TableHead className="cursor-pointer text-brown" onClick={() => toggleSort("created_at")}>
                Created {sortField === "created_at" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead className="text-brown">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No orders found</TableCell></TableRow>
            )}
            {paginated.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <div className="font-medium text-brown">{order.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{order.email}</div>
                </TableCell>
                <TableCell>{order.phone_number}</TableCell>
                <TableCell>{order.pickup_date}</TableCell>
                <TableCell>{order.time_slot}</TableCell>
                <TableCell>
                  <Select value={order.status} onValueChange={(v) => updateStatus.mutate({ id: order.id, status: v as OrderStatus })}>
                    <SelectTrigger className="h-7 w-28 border-0 p-0">
                      <Badge className={statusColors[order.status as OrderStatus] + " text-xs"}>{order.status}</Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {(["Pending", "Completed", "Cancelled", "Picked Up"] as OrderStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(order.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewOrder(order)}>
                      <Eye className="h-4 w-4 text-brown-light" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Order</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone. This will permanently delete the order from {order.customer_name}.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteOrder.mutate(order.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View order modal */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brown">Order Details</DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="font-medium text-brown">Customer:</span> {viewOrder.customer_name}</div>
                <div><span className="font-medium text-brown">Email:</span> {viewOrder.email}</div>
                <div><span className="font-medium text-brown">Phone:</span> {viewOrder.phone_number}</div>
                <div><span className="font-medium text-brown">Pickup:</span> {viewOrder.pickup_date}</div>
                <div><span className="font-medium text-brown">Slot:</span> {viewOrder.time_slot}</div>
                <div><span className="font-medium text-brown">Status:</span> <Badge className={statusColors[viewOrder.status as OrderStatus]}>{viewOrder.status}</Badge></div>
              </div>
              {viewOrder.special_requests && (
                <div>
                  <span className="font-medium text-brown">Special Requests:</span>
                  <p className="mt-1 rounded bg-background p-2 text-muted-foreground">{viewOrder.special_requests}</p>
                </div>
              )}
              <div className="text-xs text-muted-foreground">Created: {format(new Date(viewOrder.created_at), "PPpp")}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
