import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, ShoppingBag, CheckCheck, ChevronRight, Sparkles, Truck, Tag, Plus, Minus, Trash2, Loader2 } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { apiClient } from "@/integrations/api/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DBNotification {
  id: number;
  user_id: number | null;
  title: string;
  description: string | null;
  type: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const getTypeIcon = (type: string | null) => {
  switch (type) {
    case "promo":
      return Tag;
    case "system":
      return Sparkles;
    case "order":
      return Truck;
    default:
      return Sparkles;
  }
};

export function HeaderNav() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, getTotalItems, getTotalPrice } = useCartStore();
  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);

  const fetchNotifications = async () => {
    setIsLoadingNotifs(true);
    try {
      const { data } = await apiClient
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data as DBNotification[]);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      for (const id of unreadIds) {
        await apiClient.from("notifications").update({ is_read: true }).eq("id", id);
      }
      toast.success("Semua notifikasi ditandai dibaca");
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };

  const markOneAsRead = async (n: DBNotification) => {
    if (!n.is_read) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
      );
      await apiClient.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    if (n.link_url) {
      navigate(n.link_url);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm">
      <div className="px-4 py-3 max-w-md mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-2xl shadow-soft group-hover:scale-105 transition-transform">
            🧁
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
              Sarah Bakery
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Roti & Kue Segar Setiap Hari
            </p>
          </div>
        </Link>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* 1. Live Notification Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative p-2.5 rounded-full hover:bg-secondary text-foreground transition-colors focus:outline-none"
                aria-label="Notifikasi"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 p-0 shadow-lg rounded-2xl border-border bg-card"
            >
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-sm">Notifikasi Langsung</h4>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      {unreadCount} baru
                    </Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1 text-primary" />
                    Dibaca
                  </Button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {isLoadingNotifs ? (
                  <div className="p-6 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                    <span className="text-xs text-muted-foreground">Memuat notifikasi...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Belum ada notifikasi
                  </div>
                ) : (
                  notifications.map((n) => {
                    const IconComponent = getTypeIcon(n.type);
                    return (
                      <div
                        key={n.id}
                        onClick={() => markOneAsRead(n)}
                        className={`p-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                          !n.is_read ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {n.title}
                            </p>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          {n.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                              {n.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-2 border-t border-border text-center">
                <Link
                  to="/products"
                  className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  Lihat Semua Promo <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </PopoverContent>
          </Popover>

          {/* 2. Fully Functional Live Cart Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative p-2.5 rounded-full hover:bg-secondary text-foreground transition-colors focus:outline-none"
                aria-label="Keranjang Belanja"
              >
                <ShoppingBag className="w-5 h-5 text-primary" />
                {totalItems > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-4 px-1 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 p-0 shadow-lg rounded-2xl border-border bg-card"
            >
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-sm">Keranjang Belanja</h4>
                </div>
                <Badge variant="outline" className="text-[11px]">
                  {totalItems} Item
                </Badge>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {items.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-3xl mb-2">🛍️</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      Keranjang Anda masih kosong
                    </p>
                    <Button
                      size="sm"
                      variant="link"
                      onClick={() => navigate("/products")}
                      className="mt-1 text-xs text-primary"
                    >
                      Mulai Belanja Now
                    </Button>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="p-3 flex items-center gap-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-11 h-11 rounded-xl object-cover border border-border flex-shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-xl flex-shrink-0">
                          🥐
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-primary font-bold mt-0.5">
                          {formatRp(Number(item.price))}
                        </p>

                        {/* Interactive Quantity Controls */}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center border border-border rounded-lg bg-secondary/30 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.quantity <= 1) {
                                  removeItem(item.id);
                                } else {
                                  updateQuantity(item.id, item.quantity - 1);
                                }
                              }}
                              className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-foreground flex-shrink-0 self-end mb-1">
                        {formatRp(Number(item.price) * item.quantity)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="p-3 border-t border-border space-y-2.5 bg-muted/30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Total Harga:</span>
                    <span className="font-bold text-sm text-primary">
                      {formatRp(totalPrice)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/cart")}
                      className="w-full text-xs rounded-xl"
                    >
                      Lihat Keranjang
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => navigate("/cart")}
                      className="w-full text-xs rounded-xl font-bold"
                    >
                      Checkout ({totalItems})
                    </Button>
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
