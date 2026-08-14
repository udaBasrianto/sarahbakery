import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, 
  ShoppingBag, 
  ShoppingCart, 
  User, 
  Sparkles, 
  Menu, 
  Newspaper, 
  ChefHat, 
  Gift, 
  Heart, 
  Clock, 
  ShieldCheck, 
  X
} from "lucide-react";
import { useCartStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { apiClient } from "@/integrations/api/client";

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Auth state listener & admin check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await apiClient.auth.getSession();
      setIsLoggedIn(!!session);
      if (session?.user) {
        const { data: adminData } = await apiClient
          .from("super_admins")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        setIsAdmin(!!adminData);
      } else {
        setIsAdmin(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = apiClient.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        apiClient
          .from("super_admins")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data }) => setIsAdmin(!!data));
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Smart Auto-Hide on Scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Hide bottom nav on admin pages
  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  const handleNavClick = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  // Only menus NOT present on the bottom navigation bar
  const extraMenus = [
    { icon: Newspaper, label: "Artikel", path: "/blog" },
    { icon: ChefHat, label: "Komunitas", path: "/community" },
    { icon: Gift, label: "Affiliate", path: "/dashboard/affiliate" },
    { icon: Heart, label: "Wishlist", path: "/dashboard/wishlist" },
    { icon: Clock, label: "Pesanan", path: "/dashboard/orders" },
    { 
      icon: User, 
      label: isLoggedIn ? "Akun" : "Masuk", 
      path: isLoggedIn ? "/dashboard" : "/auth" 
    },
    ...(isAdmin ? [{ icon: ShieldCheck, label: "Admin", path: "/admin/dashboard" }] : []),
  ];

  return (
    <>
      {/* Floating Bottom Nav Bar */}
      <nav
        className={cn(
          "fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-md transition-all duration-300 ease-in-out",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
        )}
      >
        <div className="relative bg-card/90 backdrop-blur-xl border border-border/80 rounded-full shadow-2xl px-2.5 py-1.5 flex items-center justify-between">
          
          {/* 1. Beranda */}
          <Link
            to="/"
            className={cn(
              "relative flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all duration-300 group",
              location.pathname === "/" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "relative flex items-center justify-center p-1 rounded-xl transition-all duration-300",
                location.pathname === "/" && "bg-primary/10 -translate-y-1 shadow-sm"
              )}
            >
              <Home className={cn("w-5 h-5 transition-all duration-300", location.pathname === "/" ? "scale-115 text-primary stroke-[2.5]" : "group-hover:scale-105")} />
            </div>
            <span className={cn("text-[10px] mt-0.5 transition-all duration-300 font-medium", location.pathname === "/" ? "font-bold text-primary scale-105" : "text-muted-foreground")}>
              Beranda
            </span>
          </Link>

          {/* 2. Produk */}
          <Link
            to="/products"
            className={cn(
              "relative flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all duration-300 group",
              location.pathname.startsWith("/products") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "relative flex items-center justify-center p-1 rounded-xl transition-all duration-300",
                location.pathname.startsWith("/products") && "bg-primary/10 -translate-y-1 shadow-sm"
              )}
            >
              <ShoppingBag className={cn("w-5 h-5 transition-all duration-300", location.pathname.startsWith("/products") ? "scale-115 text-primary stroke-[2.5]" : "group-hover:scale-105")} />
            </div>
            <span className={cn("text-[10px] mt-0.5 transition-all duration-300 font-medium", location.pathname.startsWith("/products") ? "font-bold text-primary scale-105" : "text-muted-foreground")}>
              Produk
            </span>
          </Link>

          {/* 3. Center FAB — Custom Order */}
          <div className="relative -mt-6 mx-0.5 flex flex-col items-center">
            <Link
              to="/custom-order"
              className={cn(
                "w-12 h-12 rounded-full bg-gradient-to-tr from-primary via-amber-500 to-orange-400 text-primary-foreground shadow-lg shadow-primary/35 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-card ring-2 ring-primary/20",
                location.pathname === "/custom-order" && "ring-4 ring-primary/40 scale-110 -translate-y-0.5"
              )}
              title="Pesan Custom Cake"
            >
              <Sparkles className={cn("w-5 h-5 transition-transform duration-500", location.pathname === "/custom-order" ? "animate-spin-slow scale-110" : "")} />
            </Link>
            <span className="text-[9px] font-bold text-primary mt-0.5 tracking-tight uppercase">
              Custom
            </span>
          </div>

          {/* 4. Keranjang */}
          <Link
            to="/cart"
            className={cn(
              "relative flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all duration-300 group",
              location.pathname === "/cart" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "relative flex items-center justify-center p-1 rounded-xl transition-all duration-300",
                location.pathname === "/cart" && "bg-primary/10 -translate-y-1 shadow-sm"
              )}
            >
              <ShoppingCart className={cn("w-5 h-5 transition-all duration-300", location.pathname === "/cart" ? "scale-115 text-primary stroke-[2.5]" : "group-hover:scale-105")} />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[17px] h-4 px-1 bg-accent text-accent-foreground text-[9px] font-extrabold rounded-full flex items-center justify-center animate-bounce shadow-sm">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </div>
            <span className={cn("text-[10px] mt-0.5 transition-all duration-300 font-medium", location.pathname === "/cart" ? "font-bold text-primary scale-105" : "text-muted-foreground")}>
              Keranjang
            </span>
          </Link>

          {/* 5. Menu Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={cn(
              "relative flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all duration-300 group",
              isMenuOpen ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "relative flex items-center justify-center p-1 rounded-xl transition-all duration-300",
                isMenuOpen && "bg-primary/10 -translate-y-1 shadow-sm"
              )}
            >
              <Menu className="w-5 h-5 group-hover:scale-105 transition-transform" />
            </div>
            <span className="text-[10px] mt-0.5 font-medium text-muted-foreground group-hover:text-foreground">
              Menu
            </span>
          </button>

        </div>
      </nav>

      {/* Backdrop */}
      <div
        onClick={() => setIsMenuOpen(false)}
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-300",
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Simple Icon-Only Bottom Sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none transition-transform duration-300 ease-out",
          isMenuOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="w-full max-w-md bg-card rounded-t-3xl border-t border-x border-border shadow-2xl px-5 pt-3 pb-6 pointer-events-auto">
          
          {/* Drag Handle */}
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-2.5" />

          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/70">
            <span className="text-xs font-bold text-foreground">Menu Lainnya</span>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="w-7 h-7 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Simple Icon Grid */}
          <div className="grid grid-cols-3 gap-y-4 gap-x-2 py-2">
            {extraMenus.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  className="flex flex-col items-center justify-center gap-1.5 group text-center"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-xs",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md scale-105"
                      : "bg-secondary text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-110"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    "text-xs font-medium truncate max-w-[85px]",
                    isActive ? "text-primary font-bold" : "text-foreground"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </>
  );
}
