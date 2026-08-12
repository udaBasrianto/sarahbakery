import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { Package, ClipboardList, TrendingUp, Clock } from "lucide-react";

export default function AdminDashboard() {
  const { data: productsCount = 0 } = useQuery({
    queryKey: ["admin-products-count"],
    queryFn: async () => {
      const { count, error } = await apiClient
        .from("products")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: ordersData } = useQuery({
    queryKey: ["admin-orders-stats"],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("orders")
        .select("status, total_amount");
      if (error) throw error;
      
      const total = data?.length || 0;
      const pending = data?.filter((o) => o.status === "pending").length || 0;
      const totalRevenue = data?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      
      return { total, pending, totalRevenue };
    },
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stats = [
    {
      icon: Package,
      label: "Total Produk",
      value: productsCount,
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      icon: ClipboardList,
      label: "Total Pesanan",
      value: ordersData?.total || 0,
      color: "bg-green-500/10 text-green-600",
    },
    {
      icon: Clock,
      label: "Pesanan Pending",
      value: ordersData?.pending || 0,
      color: "bg-orange-500/10 text-orange-600",
    },
    {
      icon: TrendingUp,
      label: "Total Pendapatan",
      value: formatPrice(ordersData?.totalRevenue || 0),
      color: "bg-purple-500/10 text-purple-600",
    },
  ];

  return (
    <div className="p-4 lg:p-6">
      <h1 className="font-display text-2xl font-bold text-foreground mb-6">
        Dashboard
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card rounded-2xl p-4 shadow-soft">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-display text-xl font-bold text-foreground mt-1">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-card rounded-2xl p-4 lg:p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">
          Pesanan Terbaru
        </h2>

        {recentOrders.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Belum ada pesanan
          </p>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-foreground">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">
                    {formatPrice(Number(order.total_amount))}
                  </p>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                      order.status === "pending"
                        ? "bg-orange-100 text-orange-700"
                        : order.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



