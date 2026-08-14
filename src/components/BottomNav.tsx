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
  Phone, 
  MapPin, 
  X, 
  ChevronRight,
  LogOut,
  LogIn
} from "lucide-react";
import { useCartStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { apiClient } from "@/integrations/api/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Auth state listener & profile fetch
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await apiClient.auth.getSession();
      setIsLoggedIn(!!session);
      if (session?.user) {
        setUserProfile(session.user);
        // Check admin role
        const { data: adminData } = await apiClient
          .from("super_admins")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        setIsAdmin(!!adminData);
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = apiClient.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        setUserProfile(session.user);
      } else {
        setUserProfile(null);
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
        setIsVisible(false); // Scroll down -> hide
      } else {
        setIsVisible(true);  // Scroll up -> show
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
    setIsSheetOpen(false);
    navigate(path);
  };

  return (
    <>
      <nav
        className={cn(
          "fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md transition-all duration-300 ease-in-out",
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

          {/* 3. Center Floating Action Button (FAB) — Custom Order */}
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

          {/* 5. Semua Menu (Drawer Sheet Trigger) */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all duration-300 group",
                  isSheetOpen || location.pathname === "/blog" || location.pathname === "/community" || location.pathname.startsWith("/dashboard")
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "relative flex items-center justify-center p-1 rounded-xl transition-all duration-300",
                    (isSheetOpen || location.pathname === "/blog" || location.pathname === "/community") && "bg-primary/10 -translate-y-1 shadow-sm"
                  )}
                >
                  <Menu className="w-5 h-5 group-hover:scale-105 transition-transform" />
                </div>
                <span className="text-[10px] mt-0.5 font-medium text-muted-foreground group-hover:text-foreground">
                  Menu
                </span>
              </button>
            </SheetTrigger>

            <SheetContent side="bottom" className="rounded-t-3xl max-h-[88vh] overflow-y-auto px-4 pb-8 pt-4">
              <SheetHeader className="text-left pb-3 border-b border-border/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
                      🧁
                    </div>
                    <div>
                      <SheetTitle className="font-display text-lg font-bold text-foreground">
                        Menu Sarah Bakery
                      </SheetTitle>
                      <p className="text-xs text-muted-foreground">Jelajahi seluruh layanan, resep &amp; promo</p>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* User Profile Card / Login Banner */}
              <div className="mt-4 p-3.5 bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between">
                {isLoggedIn ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-xs">
                      {(userProfile?.user_metadata?.full_name || userProfile?.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground truncate max-w-[180px]">
                        {userProfile?.user_metadata?.full_name || userProfile?.email?.split("@")[0]}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                        {userProfile?.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Selamat Datang di Sarah Bakery!</p>
                    <p className="text-[11px] text-muted-foreground">Masuk untuk melihat pesanan &amp; simpan resep</p>
                  </div>
                )}

                <Button
                  size="sm"
                  onClick={() => handleNavClick(isLoggedIn ? "/dashboard" : "/auth")}
                  className="rounded-xl font-bold text-xs h-8 shadow-xs"
                >
                  {isLoggedIn ? "Dashboard" : "Masuk"}
                </Button>
              </div>

              {/* Main Navigation Grid */}
              <div className="mt-4 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                  Fitur &amp; Halaman Utama
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Artikel & Resep Dapur */}
                  <button
                    type="button"
                    onClick={() => handleNavClick("/blog")}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all text-left shadow-xs group"
                  >
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                      <Newspaper className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-xs text-foreground">Artikel &amp; Blog</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Tips &amp; resep kue</p>
                    </div>
                  </button>

                  {/* Komunitas Resep Baking */}
                  <button
                    type="button"
                    onClick={() => handleNavClick("/community")}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all text-left shadow-xs group"
                  >
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform">
                      <ChefHat className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-xs text-foreground">Komunitas Resep</p>
                        <span className="text-[8px] font-bold px-1 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          Baru
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Berbagi resep kreasi</p>
                    </div>
                  </button>

                  {/* Katalog Produk */}
                  <button
                    type="button"
                    onClick={() => handleNavClick("/products")}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all text-left shadow-xs group"
                  >
                    <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">Katalog Produk</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Bolu, roti, cookies</p>
                    </div>
                  </button>

                  {/* Pesanan Custom */}
                  <button
                    type="button"
                    onClick={() => handleNavClick("/custom-order")}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all text-left shadow-xs group"
                  >
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">Pesanan Custom</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Kue ultah &amp; event</p>
                    </div>
                  </button>

                  {/* Program Affiliate */}
                  <button
                    type="button"
                    onClick={() => handleNavClick("/dashboard/affiliate")}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all text-left shadow-xs group"
                  >
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">Program Affiliate</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Dapatkan komisi</p>
                    </div>
                  </button>

                  {/* Wishlist Favorit */}
                  <button
                    type="button"
                    onClick={() => handleNavClick("/dashboard/wishlist")}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all text-left shadow-xs group"
                  >
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">Wishlist Favorit</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Kue yang disimpan</p>
                    </div>
                  </button>

                  {/* Riwayat Pesanan */}
                  <button
                    type="button"
                    onClick={() => handleNavClick("/dashboard/orders")}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all text-left shadow-xs group"
                  >
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">Riwayat Pesanan</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Lacak status kue</p>
                    </div>
                  </button>

                  {/* Panel Admin (hanya jika super admin) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleNavClick("/admin/dashboard")}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all text-left shadow-xs group col-span-2"
                    >
                      <div className="p-2 rounded-xl bg-primary text-primary-foreground group-hover:scale-105 transition-transform">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-primary">Panel Admin Toko</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Kelola produk, pesanan, artikel, resep &amp; pengaturan</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

        </div>
      </nav>
    </>
  );
}

