import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, Trash2, ChevronLeft, ChevronRight, Download, Printer, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type OrderStatus = "Pending" | "Completed" | "Cancelled" | "Picked Up";
type SortField = "created_at" | "pickup_date" | "customer_name" | "phone_number" | "time_slot";

const statusColors: Record<OrderStatus, string> = {
  Pending: "bg-saffron/20 text-saffron-dark",
  Completed: "bg-success/20 text-success",
  Cancelled: "bg-destructive/20 text-destructive",
  "Picked Up": "bg-brown/20 text-brown",
};

const PAGE_SIZE = 10;

const SortIcon = ({ field, current, dir }: { field: string; current: string; dir: string }) => {
  if (field !== current) return <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="inline h-3 w-3 ml-1" /> : <ArrowDown className="inline h-3 w-3 ml-1" />;
};

const Orders = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [viewOrder, setViewOrder] = useState<any | null>(null);

  // Read URL params on mount
  useEffect(() => {
    const status = searchParams.get("status");
    const pickupDate = searchParams.get("pickupDate");
    if (status) setStatusFilter(status);
    if (pickupDate) setDateFilter(pickupDate);
    // Clear params after reading
    if (status || pickupDate) {
      setSearchParams({}, { replace: true });
    }
  }, []);

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
    let aVal: string | number;
    let bVal: string | number;
    switch (sortField) {
      case "customer_name":
        aVal = a.customer_name.toLowerCase();
        bVal = b.customer_name.toLowerCase();
        break;
      case "phone_number":
        aVal = a.phone_number;
        bVal = b.phone_number;
        break;
      case "time_slot":
        aVal = a.time_slot;
        bVal = b.time_slot;
        break;
      case "pickup_date":
        aVal = new Date(a.pickup_date).getTime();
        bVal = new Date(b.pickup_date).getTime();
        break;
      default:
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
    }
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const exportPDF = useCallback(() => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Vinayaka Pooja Flowers", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "PPpp")}`, 14, 26);
    doc.text(`${filtered.length} orders`, 14, 32);

    autoTable(doc, {
      startY: 38,
      head: [["Customer", "Email", "Phone", "Pickup Date", "Slot", "Status", "Created"]],
      body: filtered.map((o) => [
        o.customer_name,
        o.email,
        o.phone_number,
        o.pickup_date,
        o.time_slot,
        o.status,
        format(new Date(o.created_at), "MMM d, yyyy"),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [217, 119, 6] },
    });

    doc.save("vinayaka-orders.pdf");
    toast.success("PDF downloaded");
  }, [filtered]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const rows = filtered
      .map(
        (o) =>
          `<tr><td>${o.customer_name}</td><td>${o.email}</td><td>${o.phone_number}</td><td>${o.pickup_date}</td><td>${o.time_slot}</td><td>${o.status}</td><td>${format(new Date(o.created_at), "MMM d, yyyy")}</td></tr>`
      )
      .join("");
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Vinayaka Orders</title><style>body{font-family:sans-serif;padding:20px}h1{color:#5c3310}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:12px}th{background:#d97706;color:#fff}</style></head><body><h1>Vinayaka Pooja Flowers</h1><p>${format(new Date(), "PPpp")} — ${filtered.length} orders</p><table><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Pickup</th><th>Slot</th><th>Status</th><th>Created</th></tr>${rows}</table><script>window.print();window.close();<\/script></body></html>`);
    printWindow.document.close();
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-brown">Orders</h1>
        <div className="flex gap-2">
          <Button onClick={exportPDF} variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

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
              <TableHead className="text-brown cursor-pointer select-none" onClick={() => toggleSort("customer_name")}>
                Customer <SortIcon field="customer_name" current={sortField} dir={sortDir} />
              </TableHead>
              <TableHead className="text-brown cursor-pointer select-none" onClick={() => toggleSort("phone_number")}>
                Phone <SortIcon field="phone_number" current={sortField} dir={sortDir} />
              </TableHead>
              <TableHead className="text-brown cursor-pointer select-none" onClick={() => toggleSort("pickup_date")}>
                Pickup Date <SortIcon field="pickup_date" current={sortField} dir={sortDir} />
              </TableHead>
              <TableHead className="text-brown cursor-pointer select-none" onClick={() => toggleSort("time_slot")}>
                Slot <SortIcon field="time_slot" current={sortField} dir={sortDir} />
              </TableHead>
              <TableHead className="text-brown">Status</TableHead>
              <TableHead className="text-brown cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                Created <SortIcon field="created_at" current={sortField} dir={sortDir} />
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
