import { Home, ShoppingBag, Newspaper, ShoppingCart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCartStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { apiClient } from "@/integrations/api/client";

const navItems = [
  { icon: Home, label: "Beranda", path: "/" },
  { icon: ShoppingBag, label: "Produk", path: "/products" },
  { icon: Newspaper, label: "Blog", path: "/blog" },
  { icon: ShoppingCart, label: "Keranjang", path: "/cart" },
];

export function BottomNav() {
  const location = useLocation();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = apiClient.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    apiClient.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Hide bottom nav on admin pages
  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  const accountItem = {
    icon: User,
    label: isLoggedIn ? "Akun" : "Masuk",
    path: isLoggedIn ? "/dashboard" : "/auth",
  };

  const allNavItems = [...navItems, accountItem];

  return (
    <nav className="fixed left-1/2 -translate-x-1/2 z-50 w-full max-w-md bg-card/90 backdrop-blur-lg border border-border border-b-0 rounded-t-2xl shadow-float" style={{ bottom: "0px" }}>
      <div className="flex items-center justify-around h-16 px-3">
        {allNavItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          const isCart = path === "/cart";

          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-300",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform",
                    isActive && "scale-110"
                  )}
                />
                {isCart && totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-all",
                  isActive && "font-semibold"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


