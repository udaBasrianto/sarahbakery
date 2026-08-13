import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, ShoppingCart, User, Sparkles } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { apiClient } from "@/integrations/api/client";

export function BottomNav() {
  const location = useLocation();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = apiClient.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    apiClient.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
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

  const leftNavItems = [
    { icon: Home, label: "Beranda", path: "/" },
    { icon: ShoppingBag, label: "Produk", path: "/products" },
  ];

  const rightNavItems = [
    { icon: ShoppingCart, label: "Keranjang", path: "/cart", isCart: true },
    {
      icon: User,
      label: isLoggedIn ? "Akun" : "Masuk",
      path: isLoggedIn ? "/dashboard" : "/auth",
    },
  ];

  return (
    <nav
      className={cn(
        "fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md transition-all duration-300 ease-in-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
      )}
    >
      <div className="relative bg-card/90 backdrop-blur-xl border border-border/80 rounded-full shadow-2xl px-3 py-1.5 flex items-center justify-between">
        
        {/* Left Items */}
        <div className="flex items-center justify-around flex-1">
          {leftNavItems.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "relative flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all duration-300",
                  isActive
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-transform duration-300",
                      isActive && "scale-110"
                    )}
                  />
                  {isActive && (
                    <span className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] mt-0.5 font-medium">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Center Floating Action Button (FAB) — Custom Order */}
        <div className="relative -mt-6 mx-1 flex flex-col items-center">
          <Link
            to="/custom-order"
            className={cn(
              "w-13 h-13 w-12 h-12 rounded-full bg-gradient-to-tr from-primary via-amber-500 to-orange-400 text-primary-foreground shadow-lg shadow-primary/35 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-card ring-2 ring-primary/20",
              location.pathname === "/custom-order" && "ring-4 ring-primary/40 scale-105"
            )}
            title="Pesan Custom Cake"
          >
            <Sparkles className="w-5 h-5 animate-spin-slow" />
          </Link>
          <span className="text-[9px] font-bold text-primary mt-0.5 tracking-tight uppercase">
            Custom
          </span>
        </div>

        {/* Right Items */}
        <div className="flex items-center justify-around flex-1">
          {rightNavItems.map(({ icon: Icon, label, path, isCart }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "relative flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all duration-300",
                  isActive
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-transform duration-300",
                      isActive && "scale-110"
                    )}
                  />
                  {isCart && totalItems > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-4.5 px-1 bg-accent text-accent-foreground text-[10px] font-extrabold rounded-full flex items-center justify-center animate-bounce shadow-sm">
                      {totalItems > 99 ? "99+" : totalItems}
                    </span>
                  )}
                  {isActive && !isCart && (
                    <span className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] mt-0.5 font-medium">{label}</span>
              </Link>
            );
          })}
        </div>

      </div>
    </nav>
  );
}
