import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ArrowLeft, CalendarIcon, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ImageUpload } from "@/components/ImageUpload";
import { apiClient } from "@/integrations/api/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDefaultStoreId } from "@/hooks/useDefaultStore";

export default function CustomOrderPage() {
  const storeId = useDefaultStoreId();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [productType, setProductType] = useState("Kue Custom");
  const [details, setDetails] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [referenceImage, setReferenceImage] = useState("");
  const [preorderDate, setPreorderDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
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

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  const estPrice = Number(estimatedPrice) || 0;
  const qty = Math.max(1, Number(quantity) || 1);
  const totalEst = estPrice * qty;
  const dpAmount = Math.round(totalEst * 0.5);

  const handleSubmit = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Mohon isi nama dan nomor telepon");
      return;
    }
    if (!details.trim()) {
      toast.error("Jelaskan detail kue custom Anda");
      return;
    }
    if (!preorderDate) {
      toast.error("Pilih tanggal PO");
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

      const item = {
        id: `custom-${Date.now()}`,
        name: `${productType} (Custom)`,
        price: estPrice,
        quantity: qty,
      };

      const { data: insertedOrder, error } = await apiClient
        .from("orders")
        .insert({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_address: customerAddress.trim() || null,
          items: [item],
          total_amount: totalEst,
          notes: notes.trim() || null,
          status: "pending",
          user_id: currentUserId,
          order_type: "custom",
          preorder_date: format(preorderDate, "yyyy-MM-dd"),
          dp_amount: dpAmount,
          dp_status: "unpaid",
          custom_details: details.trim(),
          custom_image_url: referenceImage || null,
          store_id: storeId!,
        })
        .select("id")
        .single();

      if (error) throw error;

      const orderNumber = insertedOrder?.id
        ? `#${insertedOrder.id.slice(0, 8).toUpperCase()}`
        : "";

      const message =
        `✨ *Permintaan Custom Order - Sarah Bakery*\n\n` +
        (orderNumber ? `🧾 *No. Order:* ${orderNumber}\n` : "") +
        `👤 *Nama:* ${customerName}\n` +
        `📱 *Telepon:* ${customerPhone}\n` +
        (customerAddress ? `📍 *Alamat:* ${customerAddress}\n` : "") +
        `\n🎂 *Jenis:* ${productType}\n` +
        `📝 *Detail:*\n${details}\n` +
        `🔢 *Jumlah:* ${qty}\n` +
        (estPrice > 0 ? `💰 *Estimasi Harga/pcs:* ${formatPrice(estPrice)}\n` : "") +
        (totalEst > 0 ? `💰 *Estimasi Total:* ${formatPrice(totalEst)}\n` : "") +
        `\n📅 *Tanggal PO:* ${format(preorderDate, "EEEE, d MMMM yyyy", { locale: idLocale })}\n` +
        (totalEst > 0
          ? `💵 *DP 50% (wajib):* ${formatPrice(dpAmount)}\n` +
            `Sisa Pelunasan: ${formatPrice(totalEst - dpAmount)}\n`
          : `💵 *DP 50%* akan dihitung setelah konfirmasi harga oleh admin.\n`) +
        (referenceImage ? `\n🖼️ *Referensi:* ${referenceImage}\n` : "") +
        (notes ? `\n🗒️ *Catatan:* ${notes}` : "");

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      toast.success("Permintaan custom order terkirim!");
      window.open(whatsappUrl, "_blank");
      navigate("/");
    } catch (error) {
      console.error("Custom order error:", error);
      toast.error("Gagal mengirim permintaan");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Pesan Kue Custom
          </h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-primary/10 rounded-2xl p-4 text-sm text-foreground/80">
          Buat kue impianmu! Isi detail desain, upload referensi (opsional), pilih tanggal pengambilan,
          dan bayar DP 50%. Admin akan konfirmasi harga final via WhatsApp.
        </div>

        <section className="bg-card rounded-2xl p-4 shadow-soft space-y-3">
          <h2 className="font-display font-semibold">Detail Produk Custom</h2>
          <div>
            <Label htmlFor="ptype">Jenis Produk</Label>
            <Input id="ptype" value={productType} onChange={(e) => setProductType(e.target.value)}
              placeholder="cth: Birthday Cake, Wedding Cake, Cupcakes" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="details">Deskripsi Desain *</Label>
            <Textarea id="details" value={details} onChange={(e) => setDetails(e.target.value)}
              rows={4}
              placeholder="Cth: Kue tart 2 tingkat tema unicorn, warna pastel, tulisan 'Happy Birthday Nayla', rasa coklat & vanilla"
              className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="qty">Jumlah</Label>
              <Input id="qty" type="number" min={1} value={quantity}
                onChange={(e) => setQuantity(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="est">Estimasi Harga/pcs</Label>
              <Input id="est" type="number" min={0} value={estimatedPrice}
                onChange={(e) => setEstimatedPrice(e.target.value)}
                placeholder="0" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Foto Referensi (Opsional)</Label>
            <div className="mt-1">
              <ImageUpload value={referenceImage} onChange={setReferenceImage} folder="custom-orders" />
            </div>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-4 shadow-soft space-y-3">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" /> Tanggal PO *
          </h2>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !preorderDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {preorderDate
                  ? format(preorderDate, "EEEE, d MMMM yyyy", { locale: idLocale })
                  : "Pilih tanggal pengambilan"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={preorderDate}
                onSelect={setPreorderDate}
                disabled={(date) => {
                  const minDate = new Date();
                  minDate.setDate(minDate.getDate() + 2);
                  minDate.setHours(0, 0, 0, 0);
                  return date < minDate;
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            *Custom order minimum 2 hari sebelum tanggal pengambilan.
          </p>
        </section>

        <section className="bg-card rounded-2xl p-4 shadow-soft space-y-3">
          <h2 className="font-display font-semibold">Informasi Pemesan</h2>
          <div>
            <Label htmlFor="name">Nama *</Label>
            <Input id="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1" />
          </div>
          <div>
            <Label htmlFor="phone">Nomor WhatsApp *</Label>
            <Input id="phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
              className="mt-1" />
          </div>
          <div>
            <Label htmlFor="addr">Alamat (Opsional)</Label>
            <Input id="addr" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)}
              className="mt-1" />
          </div>
          <div>
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="mt-1" />
          </div>
        </section>

        {totalEst > 0 && (
          <section className="bg-card rounded-2xl p-4 shadow-soft">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Estimasi Total</span>
              <span className="font-medium">{formatPrice(totalEst)}</span>
            </div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
              <span className="text-sm font-semibold text-primary">DP 50%</span>
              <span className="font-display text-xl font-bold text-primary">{formatPrice(dpAmount)}</span>
            </div>
          </section>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-12 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          {isSubmitting ? "Memproses..." : "Kirim Permintaan via WhatsApp"}
        </Button>
      </div>
    </div>
  );
}



