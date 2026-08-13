import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiClient } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { 
  User as UserIcon, 
  Package, 
  LogOut, 
  ChevronRight,
  ShoppingBag,
  MapPin,
  Phone,
  Edit2,
  LayoutDashboard,
  Heart,
  Gift
} from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BottomNav } from "@/components/BottomNav";

interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: any[];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { wishlistIds } = useWishlist();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async (uid: string) => {
      const [{ data: sa }, { data: store }] = await Promise.all([
        apiClient.from("super_admins").select("id").eq("user_id", uid).maybeSingle(),
        apiClient.from("stores").select("id").eq("owner_id", uid).eq("status", "approved").maybeSingle(),
      ]);
      setIsAdmin(!!sa || !!store);
    };
    if (user?.id) checkAdmin(user.id);
    else setIsAdmin(false);
  }, [user?.id]);

  useEffect(() => {
    const { data: { subscription } } = apiClient.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    apiClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        fetchProfile(session.user.id);
        fetchOrders(session.user.phone || "");
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await apiClient
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
      if (data.phone) {
        fetchOrders(data.phone);
      }
    }
  };

  const fetchOrders = async (phone: string) => {
    if (!phone) return;
    
    const { data } = await apiClient
      .from("orders")
      .select("*")
      .eq("customer_phone", phone)
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) {
      setOrders(data as Order[]);
    }
  };

  const handleLogout = async () => {
    await apiClient.auth.signOut();
    toast.success("Logout berhasil");
    navigate("/");
  };

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
      month: "short",
      year: "numeric",
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 pb-16 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-display font-bold">Dashboard</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 border-2 border-primary-foreground/20">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.name || "User"} />
            ) : (
              <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground text-xl">
                {profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">
              {profile?.name || "Pengguna"}
            </h2>
            <p className="text-primary-foreground/70 text-sm">{user?.email}</p>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="px-4 -mt-8">
        <div className="bg-card rounded-2xl shadow-lg p-4 grid grid-cols-3 gap-4">
          <div className="text-center p-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <ShoppingBag className="w-6 h-6 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{orders.length}</p>
            <p className="text-sm text-muted-foreground">Pesanan</p>
          </div>
          <div className="text-center p-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {orders.filter(o => o.status === "completed").length}
            </p>
            <p className="text-sm text-muted-foreground">Selesai</p>
          </div>
          <div className="text-center p-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{wishlistIds.length}</p>
            <p className="text-sm text-muted-foreground">Wishlist</p>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-foreground">Profil Saya</h3>
          <Link to="/dashboard/profile" className="text-primary text-sm flex items-center gap-1">
            <Edit2 className="w-4 h-4" />
            Edit
          </Link>
        </div>
        <div className="bg-card rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Telepon</p>
              <p className="text-foreground">{profile?.phone || "Belum diisi"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Alamat</p>
              <p className="text-foreground">{profile?.address || "Belum diisi"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-foreground">Pesanan Terakhir</h3>
          <Link to="/dashboard/orders" className="text-primary text-sm flex items-center gap-1">
            Lihat Semua
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="bg-card rounded-xl p-8 text-center">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Belum ada pesanan</p>
            <Button onClick={() => navigate("/products")} className="mt-4">
              Mulai Belanja
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(order.created_at)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                <p className="text-foreground font-medium">
                  {Array.isArray(order.items) ? order.items.length : 0} item
                </p>
                <p className="text-primary font-semibold">{formatPrice(order.total_amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Menu Links */}
      <div className="p-4">
        <h3 className="font-display font-semibold text-foreground mb-3">Menu</h3>
        <div className="bg-card rounded-xl overflow-hidden">
          <Link
            to="/dashboard/profile"
            className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <UserIcon className="w-5 h-5 text-primary" />
              <span className="text-foreground">Edit Profil</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div className="border-t border-border" />
          <Link
            to="/dashboard/orders"
            className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-primary" />
              <span className="text-foreground">Riwayat Pesanan</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div className="border-t border-border" />
          <Link
            to="/dashboard/wishlist"
            className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-primary" />
              <span className="text-foreground">Wishlist</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div className="border-t border-border" />
          <Link
            to="/dashboard/affiliate"
            className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-primary" />
              <span className="text-foreground">Program Affiliate</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
          {isAdmin && (
            <>
              <div className="border-t border-border" />
              <Link
                to="/admin/dashboard"
                className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                  <span className="text-foreground">Admin Dashboard</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}



