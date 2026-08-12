import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { apiClient } from "@/integrations/api/client";
import { 
  LayoutDashboard, 
  Package, 
  Tag,
  ClipboardList, 
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Settings,
  Image,
  FileBarChart,
  Newspaper,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Package, label: "Produk", path: "/admin/products" },
  { icon: Tag, label: "Kategori Produk", path: "/admin/categories" },
  { icon: ClipboardList, label: "Pesanan", path: "/admin/orders" },
  { icon: FileBarChart, label: "Laporan Penjualan", path: "/admin/reports" },
  { icon: Gift, label: "Affiliate", path: "/admin/affiliates" },
  { icon: Newspaper, label: "Blog", path: "/admin/blog" },
  { icon: Image, label: "Banner", path: "/admin/banners" },
  { icon: Settings, label: "Pengaturan", path: "/admin/settings" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyAccess = async (session: any) => {
      if (!session) {
        navigate("/admin");
        return;
      }
      const userId = session.user.id;

      // Check super admin
      const { data: superAdmin } = await apiClient
        .from("super_admins")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (superAdmin) {
        setIsLoading(false);
        return;
      }

      // Check approved store owner
      const { data: store } = await apiClient
        .from("stores")
        .select("id")
        .eq("owner_id", userId)
        .eq("status", "approved")
        .maybeSingle();

      if (store) {
        setIsLoading(false);
        return;
      }

      // Not authorized
      await apiClient.auth.signOut();
      toast.error("Anda tidak memiliki akses admin");
      navigate("/admin");
    };

    apiClient.auth.getSession().then(({ data: { session } }) => verifyAccess(session));

    const { data: { subscription } } = apiClient.auth.onAuthStateChange((event, session) => {
      if (!session) navigate("/admin");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await apiClient.auth.signOut();
    toast.success("Logout berhasil");
    navigate("/admin");
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
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 -ml-2 hover:bg-secondary rounded-lg"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="font-display font-bold text-foreground">Admin</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-muted-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 bg-card border-r border-border transform transition-transform duration-300 lg:translate-x-0",
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xl">
                🧁
              </div>
              <div>
                <h2 className="font-display font-bold text-foreground">Sarah Bakery</h2>
                <p className="text-xs text-muted-foreground">Admin Panel</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map(({ icon: Icon, label, path }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-primary"
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali ke Toko
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}



