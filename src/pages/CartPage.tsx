import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { MessageCircle, ArrowLeft, ShoppingBag, CalendarIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CartItem } from "@/components/CartItem";
import { useCartStore } from "@/lib/store";
import { apiClient } from "@/integrations/api/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDefaultStoreId } from "@/hooks/useDefaultStore";
import { getStoredReferralCode, clearStoredReferralCode } from "@/hooks/useReferralTracking";

export default function CartPage() {
  const storeId = useDefaultStoreId();
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isPreorder, setIsPreorder] = useState(false);
  const [preorderDate, setPreorderDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await apiClient.auth.getSession();
      if (!session?.user) return;
      const { data: profile } = await apiClient
        .from("profiles")
        .select("name, phone, address")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (profile) {
        if (profile.name) setCustomerName(profile.name);
        if (profile.phone) setCustomerPhone(profile.phone);
        if (profile.address) setCustomerAddress(profile.address);
      }
    };
    loadProfile();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const totalPrice = getTotalPrice();
  const dpAmount = isPreorder ? Math.round(totalPrice * 0.5) : 0;

  const handleCheckout = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Mohon isi nama dan nomor telepon");
      return;
    }
    if (items.length === 0) {
      toast.error("Keranjang masih kosong");
      return;
    }
    if (isPreorder && !preorderDate) {
      toast.error("Pilih tanggal Pre-Order");
      return;
    }
    if (isPreorder && preorderDate && preorderDate < new Date(new Date().toDateString())) {
      toast.error("Tanggal PO tidak valid");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: settings } = await apiClient
        .from("settings")
        .select("value")
        .eq("key", "whatsapp_number")
        .maybeSingle();

      const whatsappNumber = settings?.value || "6281234567890";

      const { data: sessionData } = await apiClient.auth.getSession();
      const currentUserId = sessionData.session?.user?.id || null;

      const orderItems = items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      const refCode = getStoredReferralCode();
      const finalNotes = [notes.trim() || null, refCode ? `REF:${refCode}` : null].filter(Boolean).join(" | ") || null;

      const { data: insertedOrder, error } = await apiClient
        .from("orders")
        .insert({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_address: customerAddress.trim() || null,
          items: orderItems,
          total_amount: totalPrice,
          notes: finalNotes,
          status: "pending",
          user_id: currentUserId,
          order_type: isPreorder ? "preorder" : "regular",
          preorder_date: isPreorder && preorderDate ? format(preorderDate, "yyyy-MM-dd") : null,
          dp_amount: dpAmount,
          dp_status: isPreorder ? "unpaid" : "paid",
          store_id: storeId!,
        })
        .select("id")
        .single();

      if (error) throw error;
      if (refCode) clearStoredReferralCode();

      const orderNumber = insertedOrder?.id
        ? `#${insertedOrder.id.slice(0, 8).toUpperCase()}`
        : "";

      const itemsList = items
        .map((item) => `• ${item.name} x${item.quantity} = ${formatPrice(item.price * item.quantity)}`)
        .join("\n");

      const poBlock = isPreorder && preorderDate
        ? `\n📅 *PRE-ORDER*\n` +
          `Tanggal Ambil/Kirim: ${format(preorderDate, "EEEE, d MMMM yyyy", { locale: idLocale })}\n` +
          `💵 *DP 50% (wajib):* ${formatPrice(dpAmount)}\n` +
          `Sisa Pelunasan: ${formatPrice(totalPrice - dpAmount)}\n`
        : "";

      const message = `🧁 *Pesanan Baru - Sarah Bakery*\n\n` +
        (orderNumber ? `🧾 *No. Order:* ${orderNumber}\n` : "") +
        `👤 *Nama:* ${customerName}\n` +
        `📱 *Telepon:* ${customerPhone}\n` +
        (customerAddress ? `📍 *Alamat:* ${customerAddress}\n` : "") +
        `\n📦 *Detail Pesanan:*\n${itemsList}\n\n` +
        `💰 *Total:* ${formatPrice(totalPrice)}\n` +
        poBlock +
        (notes ? `\n📝 *Catatan:* ${notes}` : "");

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      clearCart();
      toast.success("Pesanan berhasil dibuat!");
      window.open(whatsappUrl, "_blank");
      navigate("/");
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Gagal membuat pesanan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-safe flex flex-col">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-4">
            <h1 className="font-display text-xl font-bold text-foreground">Keranjang</h1>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
          <div className="text-6xl mb-2">🛒</div>
          <h2 className="font-display text-xl font-semibold text-foreground">Keranjang Kosong</h2>
          <p className="text-muted-foreground text-center">
            Belum ada produk di keranjang. Yuk mulai belanja!
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button onClick={() => navigate("/products")} className="rounded-full">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Lihat Produk
            </Button>
            <Button onClick={() => navigate("/custom-order")} variant="outline" className="rounded-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Pesan Kue Custom
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">
            Keranjang ({items.length})
          </h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        <section className="space-y-3">
          {items.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
        </section>

        {/* Pre-Order Section */}
        <section className="bg-card rounded-2xl p-4 shadow-soft space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                Pre-Order (PO)
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Pesan untuk tanggal tertentu. Wajib DP 50% dari total.
              </p>
            </div>
            <Switch checked={isPreorder} onCheckedChange={setIsPreorder} />
          </div>

          {isPreorder && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div>
                <Label>Tanggal PO *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full mt-1 justify-start text-left font-normal",
                        !preorderDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {preorderDate
                        ? format(preorderDate, "EEEE, d MMMM yyyy", { locale: idLocale })
                        : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={preorderDate}
                      onSelect={setPreorderDate}
                      disabled={(date) => date < new Date(new Date().toDateString())}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="bg-primary/10 rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Pesanan</span>
                  <span className="font-medium">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-primary">DP 50% (wajib)</span>
                  <span className="font-bold text-primary">{formatPrice(dpAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Sisa pelunasan saat pengambilan</span>
                  <span>{formatPrice(totalPrice - dpAmount)}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Customer Info */}
        <section className="bg-card rounded-2xl p-4 shadow-soft space-y-4">
          <h2 className="font-display font-semibold text-foreground">Informasi Pemesan</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Nama *</Label>
              <Input id="name" placeholder="Nama lengkap" value={customerName}
                onChange={(e) => setCustomerName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">Nomor WhatsApp *</Label>
              <Input id="phone" placeholder="08xxxxxxxxxx" value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="address">Alamat (Opsional)</Label>
              <Input id="address" placeholder="Alamat pengiriman" value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="notes">Catatan (Opsional)</Label>
              <Textarea id="notes" placeholder="Catatan tambahan untuk pesanan" value={notes}
                onChange={(e) => setNotes(e.target.value)} className="mt-1" rows={2} />
            </div>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-4 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Total</span>
            <span className="font-display text-lg font-bold">{formatPrice(totalPrice)}</span>
          </div>
          {isPreorder && (
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <span className="text-sm font-semibold text-primary">DP 50% sekarang</span>
              <span className="font-display text-xl font-bold text-primary">{formatPrice(dpAmount)}</span>
            </div>
          )}

          <Button
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="w-full h-12 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            {isSubmitting ? "Memproses..." : isPreorder ? "Pesan PO via WhatsApp" : "Pesan via WhatsApp"}
          </Button>
        </section>
      </div>
    </div>
  );
}



