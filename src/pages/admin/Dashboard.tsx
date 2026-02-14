import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock, CheckCircle, CalendarDays } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const PIE_COLORS = ["hsl(28, 90%, 52%)", "hsl(25, 40%, 20%)", "hsl(140, 45%, 42%)"];

const Dashboard = () => {
  const { data: orders = [] } = useQuery({
    queryKey: ["all-orders-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flower_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const total = orders.length;
  const pending = orders.filter((o) => o.status === "Pending").length;
  const completed = orders.filter((o) => o.status === "Completed").length;
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayPickups = orders.filter((o) => o.pickup_date === todayStr).length;

  // Line chart: orders per day over last 14 days
  const lineData = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const count = orders.filter(
      (o) => format(new Date(o.created_at), "yyyy-MM-dd") === dateStr
    ).length;
    return { date: format(date, "MMM d"), orders: count };
  });

  // Pie chart: time slot distribution
  const slotCounts = ["Morning", "Evening", "Night"].map((slot) => ({
    name: slot,
    value: orders.filter((o) => o.time_slot === slot).length,
  }));

  const summaryCards = [
    { title: "Total Orders", value: total, icon: Package, color: "text-primary" },
    { title: "Pending", value: pending, icon: Clock, color: "text-saffron-dark" },
    { title: "Completed", value: completed, icon: CheckCircle, color: "text-success" },
    { title: "Today's Pickups", value: todayPickups, icon: CalendarDays, color: "text-brown" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brown">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-brown">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-brown">Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 25%, 85%)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="hsl(28, 90%, 52%)" strokeWidth={2} dot={{ fill: "hsl(25, 40%, 20%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-brown">Time Slot Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slotCounts} cx="50%" cy="50%" outerRadius={90} dataKey="value" label>
                  {slotCounts.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
