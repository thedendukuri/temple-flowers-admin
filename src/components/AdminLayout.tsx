import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Bell, Flower2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const AdminLayout = () => {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-orders-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("flower_orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pending");
      return count ?? 0;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Flower2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          {/* Top header */}
          <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-brown" />
              <span className="text-sm text-muted-foreground">{today}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Bell className="h-5 w-5 text-brown-light" />
                {pendingCount > 0 && (
                  <Badge className="absolute -right-2 -top-2 h-5 min-w-[20px] rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                    {pendingCount}
                  </Badge>
                )}
              </div>
              <span className="text-sm font-medium text-brown">
                {user.email}
              </span>
            </div>
          </header>
          {/* Main content */}
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
