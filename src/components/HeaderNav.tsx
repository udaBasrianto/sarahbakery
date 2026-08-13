import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, ShoppingBag, CheckCheck, ChevronRight, Sparkles, Truck, Tag } from "lucide-react";
import { useCartStore } from "@/lib/store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: any;
  link?: string;
  read: boolean;
}

const initialNotifications: NotificationItem[] = [
  {
    id: "1",
    title: "Promo Roti Manis Fresh 30%",
    description: "Nikmati diskon 30% untuk semua varian roti manis dipanggang jam 6 pagi!",
    time: "Baru saja",
    icon: Tag,
    link: "/products",
    read: false,
  },
  {
    id: "2",
    title: "Custom Birthday Cake",
    description: "Terima pesanan kue ulang tahun custom bebas pilih desain & rasa.",
    time: "2 jam lalu",
    icon: Sparkles,
    link: "/custom-order",
    read: false,
  },
  {
    id: "3",
    title: "Gratis Ongkir Kota",
    description: "Pengiriman gratis untuk seluruh transaksi minimal Rp 150.000.",
    time: "1 hari lalu",
    icon: Truck,
    link: "/products",
    read: false,
  },
];

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export function HeaderNav() {
  const navigate = useNavigate();
  const { items, getTotalItems, getTotalPrice } = useCartStore();
  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markOneAsRead = (id: string, link?: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (link) {
      navigate(link);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm">
      <div className="px-4 py-3 max-w-md mx-auto lg:max-w-7xl flex items-center justify-between">
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
          {/* 1. Notification Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative p-2.5 rounded-full hover:bg-secondary text-foreground transition-colors focus:outline-none"
                aria-label="Notifikasi"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
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
                  <h4 className="font-semibold text-sm">Notifikasi</h4>
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
                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                    Dibaca
                  </Button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Tidak ada notifikasi
                  </div>
                ) : (
                  notifications.map((n) => {
                    const IconComponent = n.icon;
                    return (
                      <div
                        key={n.id}
                        onClick={() => markOneAsRead(n.id, n.link)}
                        className={`p-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                          !n.read ? "bg-primary/5" : ""
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
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {n.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            {n.description}
                          </p>
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

          {/* 2. Cart / Bags Popover */}
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

              <div className="max-h-64 overflow-y-auto divide-y divide-border">
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
                      className="mt-1 text-xs"
                    >
                      Mulai Belanja
                    </Button>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="p-3 flex items-center gap-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg flex-shrink-0">
                          🥐
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.quantity} x {formatRp(Number(item.price))}
                        </p>
                      </div>
                      <p className="text-xs font-bold text-primary flex-shrink-0">
                        {formatRp(Number(item.price) * item.quantity)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="p-3 border-t border-border space-y-2 bg-muted/30">
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
                      Lihat Detail
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => navigate("/cart")}
                      className="w-full text-xs rounded-xl"
                    >
                      Checkout
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
