import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Download } from "lucide-react";
import { format } from "date-fns";

const CustomerEmails = () => {
  const [search, setSearch] = useState("");
  const [minOrders, setMinOrders] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: orders = [] } = useQuery({
    queryKey: ["all-orders-emails"],
    queryFn: async () => {
      const { data, error } = await supabase.from("flower_orders").select("*");
      if (error) throw error;
      return data;
    },
  });

  const customers = useMemo(() => {
    const map = new Map<string, { email: string; name: string; count: number; lastDate: string }>();
    orders.forEach((o) => {
      const existing = map.get(o.email);
      if (existing) {
        existing.count++;
        if (o.created_at > existing.lastDate) {
          existing.lastDate = o.created_at;
          existing.name = o.customer_name;
        }
      } else {
        map.set(o.email, { email: o.email, name: o.customer_name, count: 1, lastDate: o.created_at });
      }
    });
    return Array.from(map.values());
  }, [orders]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || c.email.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    const matchesMin = minOrders === "all" || c.count >= parseInt(minOrders);
    const matchesFrom = !dateFrom || c.lastDate >= dateFrom;
    const matchesTo = !dateTo || c.lastDate <= dateTo + "T23:59:59";
    return matchesSearch && matchesMin && matchesFrom && matchesTo;
  });

  const copyAll = () => {
    const emails = filtered.map((c) => c.email).join(", ");
    navigator.clipboard.writeText(emails);
    toast.success(`${filtered.length} emails copied`);
  };

  const exportCSV = () => {
    const header = "Email,Customer Name,Total Orders,Last Order Date\n";
    const rows = filtered.map((c) => `${c.email},"${c.name}",${c.count},${format(new Date(c.lastDate), "yyyy-MM-dd")}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customer-emails.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brown">Customer Emails</h1>
        <div className="flex gap-2">
          <Button onClick={copyAll} variant="outline" size="sm" className="gap-1">
            <Copy className="h-4 w-4" /> Copy All
          </Button>
          <Button onClick={exportCSV} size="sm" className="gap-1 bg-primary text-primary-foreground hover:bg-saffron-dark">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="bg-card shadow-sm">
        <CardContent className="flex flex-wrap gap-3 pt-4">
          <Input placeholder="Search email or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 bg-background" />
          <Select value={minOrders} onValueChange={setMinOrders}>
            <SelectTrigger className="w-40 bg-background"><SelectValue placeholder="Min orders" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="2">2+ orders</SelectItem>
              <SelectItem value="5">5+ orders</SelectItem>
              <SelectItem value="10">10+ orders</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 bg-background" placeholder="From" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 bg-background" placeholder="To" />
        </CardContent>
      </Card>

      <Card className="bg-card shadow-sm overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-brown">Email</TableHead>
              <TableHead className="text-brown">Customer Name</TableHead>
              <TableHead className="text-brown">Total Orders</TableHead>
              <TableHead className="text-brown">Last Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No customers found</TableCell></TableRow>
            )}
            {filtered.map((c) => (
              <TableRow key={c.email}>
                <TableCell className="font-medium">{c.email}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.count}</TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(c.lastDate), "MMM d, yyyy")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <p className="text-sm text-muted-foreground">{filtered.length} unique customers</p>
    </div>
  );
};

export default CustomerEmails;
