import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/integrations/api/client";
import { ArrowLeft, Package, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: unknown;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  notes: string | null;
}

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchUserAndOrders = async () => {
      const { data: { session } } = await apiClient.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Get user profile to get phone
      const { data: profile } = await apiClient
        .from("profiles")
        .select("phone")
        .eq("user_id", session.user.id)
        .single();

      if (profile?.phone) {
        const { data } = await apiClient
          .from("orders")
          .select("*")
          .eq("customer_phone", profile.phone)
          .order("created_at", { ascending: false });

        if (data) {
          setOrders(data as Order[]);
        }
      }

      setIsLoading(false);
    };

    fetchUserAndOrders();
  }, [navigate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Menunggu";
      case "processing":
        return "Diproses";
      case "completed":
        return "Selesai";
      case "cancelled":
        return "Dibatalkan";
      default:
        return status;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate("/dashboard")} className="p-2 -ml-2 hover:bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-foreground">Riwayat Pesanan</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Belum ada pesanan</h3>
            <p className="text-muted-foreground mb-4">
              Pesanan Anda akan muncul di sini
            </p>
            <Button onClick={() => navigate("/products")}>
              Mulai Belanja
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-card rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </p>
                    <p className="font-semibold text-foreground mt-1">
                      {Array.isArray(order.items) ? order.items.length : 0} item
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                    <p className="text-primary font-bold mt-2">
                      {formatPrice(order.total_amount)}
                    </p>
                  </div>
                </div>

                {/* Order Details (Expandable) */}
                {selectedOrder?.id === order.id && (
                  <div className="border-t border-border pt-3 mt-3 space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Detail Pesanan:</p>
                      {Array.isArray(order.items) && order.items.map((item: OrderItem, index: number) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.name} x{item.quantity}</span>
                          <span>{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    {order.customer_address && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Alamat:</p>
                        <p className="text-sm text-foreground">{order.customer_address}</p>
                      </div>
                    )}

                    {order.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Catatan:</p>
                        <p className="text-sm text-foreground">{order.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



