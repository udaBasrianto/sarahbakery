import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Settings, 
  User, 
  Lock, 
  Phone, 
  Save, 
  Loader2, 
  Bot, 
  Palette, 
  Check, 
  Shield, 
  Key, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  EyeOff, 
  LayoutGrid, 
  Store, 
  Clock, 
  CreditCard, 
  Mail, 
  MapPin, 
  MessageSquare 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/integrations/api/client";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/hooks/useAppearance";
import {
  FONT_PRESETS,
  TEXT_SIZE_PRESETS,
  THEME_PRESETS,
  SETTING_KEYS,
  DEFAULT_APPEARANCE,
  applyAppearance,
  cacheAppearance,
  getFontPreset,
  type Appearance,
} from "@/lib/appearance";
import { toast } from "sonner";
import AdminPageLayout from "./AdminPageLayout";

// Helper for upserting settings in database
async function upsertSetting(key: string, value: string) {
  const { data: existing } = await apiClient
    .from("settings")
    .select("id")
    .eq("key", key)
    .maybeSingle();

  return existing
    ? apiClient.from("settings").update({ value }).eq("key", key)
    : apiClient.from("settings").insert({ key, value, store_id: 1 });
}

// Schemas
const storeSchema = z.object({
  storeName: z.string().min(2, "Nama toko minimal 2 karakter"),
  storeTagline: z.string().optional(),
  storeAddress: z.string().optional(),
  storeHours: z.string().optional(),
  storeEmail: z.string().email("Email tidak valid").optional().or(z.literal("")),
  storeBankInfo: z.string().optional(),
});

const profileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  email: z.string().email("Email tidak valid"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Password minimal 6 karakter"),
  newPassword: z.string().min(6, "Password minimal 6 karakter"),
  confirmPassword: z.string().min(6, "Password minimal 6 karakter"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Password konfirmasi tidak cocok",
  path: ["confirmPassword"],
});

const whatsappSchema = z.object({
  whatsappNumber: z.string()
    .min(10, "Nomor WhatsApp minimal 10 digit")
    .max(15, "Nomor WhatsApp maksimal 15 digit")
    .regex(/^[0-9]+$/, "Nomor WhatsApp hanya boleh berisi angka"),
  whatsappGreeting: z.string().optional(),
});

const chatbotSchema = z.object({
  chatbotName: z.string().min(2, "Nama asisten minimal 2 karakter"),
  chatbotWelcome: z.string().min(5, "Pesan sambutan minimal 5 karakter"),
});

const googleOAuthSchema = z.object({
  clientId: z.string().min(5, "Client ID minimal 5 karakter").optional().or(z.literal("")),
  clientSecret: z.string().min(5, "Client Secret minimal 5 karakter").optional().or(z.literal("")),
});

type StoreFormValues = z.infer<typeof storeSchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type WhatsappFormValues = z.infer<typeof whatsappSchema>;
type ChatbotFormValues = z.infer<typeof chatbotSchema>;
type GoogleOAuthFormValues = z.infer<typeof googleOAuthSchema>;

export default function AdminSettingsPage() {
  const [isLoadingStore, setIsLoadingStore] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingWhatsapp, setIsLoadingWhatsapp] = useState(false);
  const [isLoadingChatbotForm, setIsLoadingChatbotForm] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [isLoadingChatbotToggle, setIsLoadingChatbotToggle] = useState(false);
  const [showOAuthSecret, setShowOAuthSecret] = useState(false);
  const [isLoadingOAuth, setIsLoadingOAuth] = useState(false);
  const [isTestingOAuthRedirect, setIsTestingOAuthRedirect] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);

  // Appearance (font, text size, theme)
  const { appearance, setAppearance, refetch: refetchAppearance } = useAppearance();
  const [draft, setDraft] = useState<Appearance>(appearance);
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);

  // Homepage product limit setting
  const [homeProductsLimit, setHomeProductsLimit] = useState("10");
  const [homeArticlesLimit, setHomeArticlesLimit] = useState("4");
  const [isSavingLimit, setIsSavingLimit] = useState(false);

  // Forms
  const storeForm = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      storeName: "Sarah Bakery",
      storeTagline: "Bakery homemade terbaik dibuat dengan cinta",
      storeAddress: "Jl. Melati No. 45, Jakarta Selatan",
      storeHours: "Senin - Minggu: 08.00 - 21.00 WIB",
      storeEmail: "halo@sarahbakery.web.id",
      storeBankInfo: "BCA 8735029182 a.n Sarah Bakery / Mandiri 123000998877",
    },
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const whatsappForm = useForm<WhatsappFormValues>({
    resolver: zodResolver(whatsappSchema),
    defaultValues: {
      whatsappNumber: "",
      whatsappGreeting: "Halo Admin Sarah Bakery, saya ingin konfirmasi pesanan",
    },
  });

  const chatbotForm = useForm<ChatbotFormValues>({
    resolver: zodResolver(chatbotSchema),
    defaultValues: {
      chatbotName: "Sarah Assistant",
      chatbotWelcome: "Halo! Ada yang bisa Sarah bantu seputar menu roti & kue lezat kami hari ini? 🥐✨",
    },
  });

  const googleOAuthForm = useForm<GoogleOAuthFormValues>({
    resolver: zodResolver(googleOAuthSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
    },
  });

  // Load all initial settings
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Load current user profile
        const res = await apiClient.auth.getUser();
        const user = (res?.data as any)?.user || res?.data;
        if (user) {
          const email = user.email || "";
          const name = user.full_name || user.user_metadata?.name || user.name || "Admin";
          setUserEmail(email);
          profileForm.setValue("email", email);
          profileForm.setValue("name", name);
          if (user.phone) profileForm.setValue("phone", user.phone);
          if (user.address) profileForm.setValue("address", user.address);
        }

        // 2. Load all store settings from settings table
        const { data: allSettings } = await apiClient
          .from("settings")
          .select("key, value");

        if (allSettings && Array.isArray(allSettings)) {
          const map = new Map(allSettings.map((s: any) => [s.key, s.value]));

          // Store Info
          if (map.get("store_name")) storeForm.setValue("storeName", map.get("store_name"));
          if (map.get("store_tagline")) storeForm.setValue("storeTagline", map.get("store_tagline"));
          if (map.get("store_address")) storeForm.setValue("storeAddress", map.get("store_address"));
          if (map.get("store_hours")) storeForm.setValue("storeHours", map.get("store_hours"));
          if (map.get("store_email")) storeForm.setValue("storeEmail", map.get("store_email"));
          if (map.get("store_bank_info")) storeForm.setValue("storeBankInfo", map.get("store_bank_info"));

          // WhatsApp
          if (map.get("whatsapp_number")) whatsappForm.setValue("whatsappNumber", map.get("whatsapp_number"));
          if (map.get("whatsapp_greeting")) whatsappForm.setValue("whatsappGreeting", map.get("whatsapp_greeting"));

          // Chatbot
          if (map.get("chatbot_enabled")) setChatbotEnabled(map.get("chatbot_enabled") !== "false");
          if (map.get("chatbot_name")) chatbotForm.setValue("chatbotName", map.get("chatbot_name"));
          if (map.get("chatbot_welcome")) chatbotForm.setValue("chatbotWelcome", map.get("chatbot_welcome"));

          // OAuth
          const cid = map.get("google_oauth_client_id") || "";
          const sec = map.get("google_oauth_client_secret") || "";
          googleOAuthForm.setValue("clientId", cid);
          googleOAuthForm.setValue("clientSecret", sec);
          setGoogleOAuthEnabled(!!cid && !!sec);

          // Home limits
          if (map.get("home_products_limit")) setHomeProductsLimit(map.get("home_products_limit"));
          if (map.get("home_articles_limit")) setHomeArticlesLimit(map.get("home_articles_limit"));
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    };

    loadData();
  }, [profileForm, storeForm, whatsappForm, chatbotForm, googleOAuthForm]);

  // Sync draft appearance when appearance changes
  useEffect(() => {
    setDraft(appearance);
  }, [appearance]);

  const previewDraft = (next: Appearance) => {
    setDraft(next);
    applyAppearance(next);
  };

  const saveAppearance = async () => {
    setIsSavingAppearance(true);
    try {
      await upsertSetting(SETTING_KEYS.font, draft.font);
      await upsertSetting(SETTING_KEYS.textSize, draft.textSize);
      await upsertSetting(SETTING_KEYS.theme, draft.theme);

      setAppearance(draft);
      cacheAppearance(draft);
      toast.success("Tampilan berhasil disimpan ke seluruh aplikasi");
      refetchAppearance();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal menyimpan tampilan";
      toast.error(msg);
    } finally {
      setIsSavingAppearance(false);
    }
  };

  const resetAppearance = () => {
    previewDraft(DEFAULT_APPEARANCE);
    toast.info("Tampilan direset ke default (klik 'Simpan Tampilan' untuk menerapkan)");
  };

  const handleSaveHomeLimit = async () => {
    setIsSavingLimit(true);
    try {
      const { error } = await upsertSetting("home_products_limit", homeProductsLimit);
      if (error) throw error;
      toast.success("Jumlah produk beranda berhasil disimpan");
    } catch {
      toast.error("Gagal menyimpan jumlah produk beranda");
    } finally {
      setIsSavingLimit(false);
    }
  };

  // Submit Handlers
  const onStoreSubmit = async (data: StoreFormValues) => {
    setIsLoadingStore(true);
    try {
      await upsertSetting("store_name", data.storeName || "Sarah Bakery");
      await upsertSetting("store_tagline", data.storeTagline || "");
      await upsertSetting("store_address", data.storeAddress || "");
      await upsertSetting("store_hours", data.storeHours || "");
      await upsertSetting("store_email", data.storeEmail || "");
      await upsertSetting("store_bank_info", data.storeBankInfo || "");

      // Also update stores table if store_id=1 exists
      try {
        await apiClient.from("stores").update({
          name: data.storeName,
          description: data.storeTagline,
          address: data.storeAddress,
          email: data.storeEmail,
        }).eq("id", 1);
      } catch {}

      toast.success("Informasi toko berhasil disimpan!");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal menyimpan informasi toko";
      toast.error(msg);
    } finally {
      setIsLoadingStore(false);
    }
  };

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsLoadingProfile(true);
    try {
      const { error } = await apiClient.auth.updateUser({
        email: data.email,
        full_name: data.name,
        phone: data.phone || null,
        data: { name: data.name, phone: data.phone, address: data.address },
      });

      if (error) throw error;

      setUserEmail(data.email);
      toast.success("Profil admin berhasil diperbarui");
      
      if (data.email !== userEmail) {
        toast.info("Email login admin telah diperbarui");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Gagal memperbarui profil";
      toast.error(errorMessage);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsLoadingPassword(true);
    try {
      const { error: signInError } = await apiClient.auth.signInWithPassword({
        email: userEmail,
        password: data.currentPassword,
      });

      if (signInError) {
        toast.error("Password saat ini salah");
        return;
      }

      const { error } = await apiClient.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;

      toast.success("Password berhasil diperbarui");
      passwordForm.reset();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Gagal memperbarui password";
      toast.error(errorMessage);
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const onWhatsappSubmit = async (data: WhatsappFormValues) => {
    setIsLoadingWhatsapp(true);
    try {
      const { error: err1 } = await upsertSetting("whatsapp_number", data.whatsappNumber);
      if (err1) throw err1;

      if (data.whatsappGreeting) {
        await upsertSetting("whatsapp_greeting", data.whatsappGreeting);
      }

      toast.success("Nomor WhatsApp & pengaturan pesanan berhasil disimpan");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Gagal memperbarui nomor WhatsApp";
      toast.error(errorMessage);
    } finally {
      setIsLoadingWhatsapp(false);
    }
  };

  const onToggleChatbot = async (enabled: boolean) => {
    setIsLoadingChatbotToggle(true);
    setChatbotEnabled(enabled);
    try {
      const value = enabled ? "true" : "false";
      const { error } = await upsertSetting("chatbot_enabled", value);
      if (error) throw error;
      toast.success(enabled ? "Chatbot diaktifkan untuk pengunjung" : "Chatbot disembunyikan");
    } catch (error: unknown) {
      setChatbotEnabled(!enabled);
      const msg = error instanceof Error ? error.message : "Gagal memperbarui status chatbot";
      toast.error(msg);
    } finally {
      setIsLoadingChatbotToggle(false);
    }
  };

  const onChatbotFormSubmit = async (data: ChatbotFormValues) => {
    setIsLoadingChatbotForm(true);
    try {
      await upsertSetting("chatbot_name", data.chatbotName);
      await upsertSetting("chatbot_welcome", data.chatbotWelcome);
      toast.success("Pengaturan nama & sambutan Chatbot berhasil disimpan!");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal menyimpan pengaturan chatbot";
      toast.error(msg);
    } finally {
      setIsLoadingChatbotForm(false);
    }
  };

  const onGoogleOAuthSubmit = async (data: GoogleOAuthFormValues) => {
    setIsLoadingOAuth(true);
    try {
      await upsertSetting("google_oauth_client_id", data.clientId ?? "");
      await upsertSetting("google_oauth_client_secret", data.clientSecret ?? "");

      const enabled = !!(data.clientId && data.clientSecret);
      setGoogleOAuthEnabled(enabled);
      toast.success(
        enabled
          ? "Konfigurasi Google OAuth berhasil disimpan! Tombol Login Google kini aktif."
          : "Konfigurasi Google OAuth disimpan (nonaktif — salah satu credential kosong)."
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Gagal menyimpan konfigurasi Google OAuth";
      toast.error(errorMessage);
    } finally {
      setIsLoadingOAuth(false);
    }
  };

  const handleSaveHomeLimits = async () => {
    setIsSavingLimit(true);
    try {
      await Promise.all([
        upsertSetting("home_products_limit", homeProductsLimit),
        upsertSetting("home_articles_limit", homeArticlesLimit),
      ]);
      queryClient.invalidateQueries({ queryKey: ["setting_home_products_limit"] });
      queryClient.invalidateQueries({ queryKey: ["setting_home_articles_limit"] });
      queryClient.invalidateQueries({ queryKey: ["home_latest_articles"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Batasan jumlah produk & artikel di Beranda berhasil disimpan!");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan batasan konten");
    } finally {
      setIsSavingLimit(false);
    }
  };

  const redirectUri =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}/auth/google/callback`
      : "";

  return (
    <AdminPageLayout>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Pengaturan Toko & Admin</h1>
          <p className="text-muted-foreground text-sm">Kelola profil toko, WhatsApp, Google OAuth, Chatbot, dan tampilan tema</p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="store" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 h-auto p-1.5 bg-muted/60 rounded-2xl gap-1">
          <TabsTrigger value="store" className="gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold">
            <Store className="w-4 h-4" />
            <span>Toko</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold">
            <Phone className="w-4 h-4" />
            <span>WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold">
            <Palette className="w-4 h-4" />
            <span>Tampilan</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold">
            <User className="w-4 h-4" />
            <span>Profil</span>
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold">
            <Lock className="w-4 h-4" />
            <span>Password</span>
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold">
            <Bot className="w-4 h-4" />
            <span>Chatbot</span>
          </TabsTrigger>
          <TabsTrigger value="oauth" className="gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold">
            <Shield className="w-4 h-4" />
            <span>OAuth</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. Tab Toko & Informasi */}
        <TabsContent value="store">
          <Card className="rounded-2xl shadow-soft border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                Informasi & Identitas Toko
              </CardTitle>
              <CardDescription>
                Kelola nama bakery, alamat fisik, jam operasional, dan info rekening pembayaran DP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...storeForm}>
                <form onSubmit={storeForm.handleSubmit(onStoreSubmit)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={storeForm.control}
                      name="storeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Nama Toko / Bakery</FormLabel>
                          <FormControl>
                            <Input placeholder="Sarah Bakery" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={storeForm.control}
                      name="storeTagline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Slogan / Tagline</FormLabel>
                          <FormControl>
                            <Input placeholder="Freshly baked every morning with love" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={storeForm.control}
                      name="storeHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            Jam Buka / Operasional
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Senin - Minggu: 08.00 - 21.00 WIB" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={storeForm.control}
                      name="storeEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            Email Kontak Toko
                          </FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="halo@sarahbakery.web.id" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={storeForm.control}
                    name="storeAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          Alamat Lengkap Toko / Lokasi Pengambilan
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Jl. Melati No. 45, Kebayoran Baru, Jakarta Selatan" 
                            rows={2}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={storeForm.control}
                    name="storeBankInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          Info Rekening Bank / Pembayaran Transfer DP Pre-order
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="BCA: 8735029182 a.n Sarah Bakery &#10;Mandiri: 123000998877 a.n Sarah Bakery &#10;QRIS: Tersedia saat konfirmasi WhatsApp" 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Instruksi ini akan ditampilkan kepada pelanggan saat memesan kue custom atau pre-order.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoadingStore} className="rounded-xl font-semibold">
                    {isLoadingStore ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Simpan Informasi Toko
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Tab WhatsApp */}
        <TabsContent value="whatsapp">
          <Card className="rounded-2xl shadow-soft border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                Nomor WhatsApp & Pengaturan Pesanan
              </CardTitle>
              <CardDescription>
                Nomor WhatsApp yang akan menerima pesan otomatis saat pembeli melakukan checkout keranjang atau memesan kue custom
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...whatsappForm}>
                <form onSubmit={whatsappForm.handleSubmit(onWhatsappSubmit)} className="space-y-4">
                  <FormField
                    control={whatsappForm.control}
                    name="whatsappNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Nomor WhatsApp Utama Toko</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="6281234567890" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Wajib gunakan kode negara (contoh: <strong>6281234567890</strong>). Jangan gunakan angka 0 di depan.
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={whatsappForm.control}
                    name="whatsappGreeting"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Pesan Pembuka (Greeting WhatsApp)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Halo Admin Sarah Bakery, saya ingin konfirmasi pesanan" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoadingWhatsapp} className="rounded-xl font-semibold">
                    {isLoadingWhatsapp ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Simpan Pengaturan WhatsApp
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Tab Tampilan */}
        <TabsContent value="appearance" className="space-y-4">
          {/* Homepage Product Limit */}
          <Card className="rounded-2xl shadow-soft border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-primary" />
                Pengaturan Jumlah Produk di Beranda
              </CardTitle>
              <CardDescription>
                Atur berapa banyak produk yang otomatis ditampilkan pada halaman Beranda utama.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Label className="text-sm font-medium">Jumlah Produk Beranda:</Label>
                <select
                  value={homeProductsLimit}
                  onChange={(e) => setHomeProductsLimit(e.target.value)}
                  className="bg-card border border-border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="4">4 Produk</option>
                  <option value="6">6 Produk</option>
                  <option value="8">8 Produk</option>
                  <option value="10">10 Produk (Default)</option>
                  <option value="12">12 Produk</option>
                  <option value="16">16 Produk</option>
                  <option value="20">20 Produk</option>
                  <option value="all">Tampilkan Semua Produk</option>
                </select>
                <Button onClick={handleSaveHomeLimit} disabled={isSavingLimit} size="sm" className="font-semibold rounded-xl">
                  {isSavingLimit ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Simpan Jumlah
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Pelanggan di beranda tetap dapat memfilter berdasarkan kategori atau mengeklik "Lihat Semua Katalog".
              </p>
            </CardContent>
          </Card>

          {/* Fonts */}
          <Card className="rounded-2xl shadow-soft border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Preset Font Google
              </CardTitle>
              <CardDescription>
                Pilih salah satu kombinasi font Google. Pratinjau langsung terlihat di bawah.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {FONT_PRESETS.map((preset) => {
                  const isActive = draft.font === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => previewDraft({ ...draft, font: preset.id })}
                      className={cn(
                        "relative text-left rounded-xl border p-4 transition-all hover:border-primary",
                        isActive ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border",
                      )}
                    >
                      {isActive && (
                        <Check className="absolute top-3 right-3 w-4 h-4 text-primary" />
                      )}
                      <p
                        className="text-xl font-semibold text-foreground"
                        style={{ fontFamily: preset.display }}
                      >
                        Sarah Bakery
                      </p>
                      <p
                        className="text-sm text-muted-foreground"
                        style={{ fontFamily: preset.body }}
                      >
                        Kue lembut, rasa istimewa 123
                      </p>
                      <p className="mt-2 text-xs font-medium text-foreground">{preset.label}</p>
                      <p className="text-xs text-muted-foreground">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Text size */}
          <Card className="rounded-2xl shadow-soft border-border/80">
            <CardHeader>
              <CardTitle>Ukuran Teks Global</CardTitle>
              <CardDescription>
                Mengubah skala seluruh teks aplikasi (pelanggan dan admin).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-4">
                {TEXT_SIZE_PRESETS.map((preset) => {
                  const isActive = draft.textSize === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => previewDraft({ ...draft, textSize: preset.id })}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all hover:border-primary",
                        isActive ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border",
                      )}
                    >
                      <span
                        className="block font-semibold text-foreground"
                        style={{ fontSize: `${preset.rootPx}px` }}
                      >
                        Aa
                      </span>
                      <span className="block text-sm font-medium text-foreground">{preset.label}</span>
                      <span className="block text-xs text-muted-foreground">{preset.description}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Theme colors */}
          <Card className="rounded-2xl shadow-soft border-border/80">
            <CardHeader>
              <CardTitle>Preset Warna Tema Toko</CardTitle>
              <CardDescription>
                Warna tema diterapkan ke seluruh tombol, badge, dan kartu produk.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {THEME_PRESETS.map((preset) => {
                  const isActive = draft.theme === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => previewDraft({ ...draft, theme: preset.id })}
                      className={cn(
                        "relative rounded-xl border p-4 text-left transition-all hover:border-primary",
                        isActive ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border",
                      )}
                    >
                      {isActive && <Check className="absolute top-3 right-3 w-4 h-4 text-primary" />}
                      <div className="flex gap-1.5 mb-3">
                        {preset.swatches.map((hex) => (
                          <span
                            key={hex}
                            className="w-7 h-7 rounded-full border border-border"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                      <p className="text-sm font-medium text-foreground">{preset.label}</p>
                      <p className="text-xs text-muted-foreground">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Live preview + actions */}
          <Card className="rounded-2xl shadow-soft border-border/80">
            <CardHeader>
              <CardTitle>Pratinjau Langsung & Simpan</CardTitle>
              <CardDescription>
                Font: {getFontPreset(draft.font).label} · Ukuran: {draft.textSize} · Tema: {draft.theme}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="font-display text-2xl font-bold text-foreground">Bolu Panggang Spesial</h3>
                <p className="text-sm text-muted-foreground">
                  Tekstur lembut dengan cita rasa khas homemade oleh Sarah Bakery.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-xl">Tambah ke Keranjang</Button>
                  <Button size="sm" variant="secondary" className="rounded-xl">Detail</Button>
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl">
                    Promo
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveAppearance} disabled={isSavingAppearance} className="rounded-xl font-semibold">
                  {isSavingAppearance ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Simpan Tampilan
                </Button>
                <Button variant="outline" onClick={resetAppearance} disabled={isSavingAppearance} className="rounded-xl">
                  Reset ke Default
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Pengaturan Batasan Jumlah Konten Beranda */}
          <Card className="rounded-2xl shadow-soft border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                Jumlah Konten Ditampilkan di Beranda
              </CardTitle>
              <CardDescription>
                Atur berapa banyak item produk dan artikel resep yang ingin dimunculkan di halaman utama (Beranda)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Produk Limit */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Maksimal Produk di Beranda
                  </label>
                  <Select value={homeProductsLimit} onValueChange={setHomeProductsLimit}>
                    <SelectTrigger className="rounded-xl bg-card border-border">
                      <SelectValue placeholder="Pilih batas produk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 Produk</SelectItem>
                      <SelectItem value="6">6 Produk</SelectItem>
                      <SelectItem value="8">8 Produk</SelectItem>
                      <SelectItem value="10">10 Produk (Default)</SelectItem>
                      <SelectItem value="12">12 Produk</SelectItem>
                      <SelectItem value="16">16 Produk</SelectItem>
                      <SelectItem value="20">20 Produk</SelectItem>
                      <SelectItem value="all">Tampilkan Semua Produk</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Batas jumlah kue/roti yang tampil sebelum pengunjung menekan &quot;Lihat Semua&quot;.
                  </p>
                </div>

                {/* Artikel Limit */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Maksimal Artikel &amp; Resep di Beranda
                  </label>
                  <Select value={homeArticlesLimit} onValueChange={setHomeArticlesLimit}>
                    <SelectTrigger className="rounded-xl bg-card border-border">
                      <SelectValue placeholder="Pilih batas artikel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Artikel</SelectItem>
                      <SelectItem value="3">3 Artikel</SelectItem>
                      <SelectItem value="4">4 Artikel (Default)</SelectItem>
                      <SelectItem value="6">6 Artikel</SelectItem>
                      <SelectItem value="8">8 Artikel</SelectItem>
                      <SelectItem value="10">10 Artikel</SelectItem>
                      <SelectItem value="all">Tampilkan Semua Artikel</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Batas jumlah artikel blog/resep yang tampil di bagian bawah Beranda.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSaveHomeLimits}
                  disabled={isSavingLimit}
                  className="rounded-xl font-semibold gap-1.5"
                >
                  {isSavingLimit ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  Simpan Batasan Konten Beranda
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Tab Profil Admin */}
        <TabsContent value="profile">
          <Card className="rounded-2xl shadow-soft border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Profil Akun Admin
              </CardTitle>
              <CardDescription>
                Ubah identitas, nomor telepon, dan email login administrator
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Nama Lengkap</FormLabel>
                          <FormControl>
                            <Input placeholder="Nama admin" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Email Login Admin</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="admin@sarahbakery.web.id" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Nomor Telepon / HP</FormLabel>
                          <FormControl>
                            <Input placeholder="081234567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Alamat</FormLabel>
                          <FormControl>
                            <Input placeholder="Kota / Domisili" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" disabled={isLoadingProfile} className="rounded-xl font-semibold">
                    {isLoadingProfile ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Simpan Profil Admin
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Tab Password */}
        <TabsContent value="password">
          <Card className="rounded-2xl shadow-soft border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Ubah Password Akun Admin
              </CardTitle>
              <CardDescription>
                Pastikan Anda menggunakan password yang kuat dan aman
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Password Saat Ini</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Password Baru</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Konfirmasi Password Baru</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoadingPassword} className="rounded-xl font-semibold">
                    {isLoadingPassword ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Perbarui Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Tab Chatbot */}
        <TabsContent value="chatbot" className="space-y-4">
          <Card className="rounded-2xl shadow-soft border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Status Widget Chatbot AI
              </CardTitle>
              <CardDescription>
                Aktifkan atau sembunyikan widget chatbot asisten di halaman pengunjung
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border p-4 bg-muted/20">
                <div className="space-y-1">
                  <Label htmlFor="chatbot-toggle" className="text-base font-semibold">
                    Tampilkan Widget Chatbot
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {chatbotEnabled 
                      ? "Widget Sarah Assistant aktif dan muncul di pojok bawah seluruh halaman pembeli."
                      : "Widget chatbot disembunyikan dari halaman pembeli."}
                  </p>
                </div>
                <Switch
                  id="chatbot-toggle"
                  checked={chatbotEnabled}
                  onCheckedChange={onToggleChatbot}
                  disabled={isLoadingChatbotToggle}
                />
              </div>

              {/* Chatbot Name & Welcome Message Form */}
              <Form {...chatbotForm}>
                <form onSubmit={chatbotForm.handleSubmit(onChatbotFormSubmit)} className="space-y-4 pt-2">
                  <FormField
                    control={chatbotForm.control}
                    name="chatbotName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Nama Asisten Bot</FormLabel>
                        <FormControl>
                          <Input placeholder="Sarah Assistant" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={chatbotForm.control}
                    name="chatbotWelcome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Pesan Sambutan Awal Chatbot</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Halo! Ada yang bisa Sarah bantu hari ini? 🥐✨" 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoadingChatbotForm} className="rounded-xl font-semibold">
                    {isLoadingChatbotForm ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Simpan Konfigurasi Chatbot
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Tab Google OAuth */}
        <TabsContent value="oauth" className="space-y-4">
          <Card className="rounded-2xl shadow-soft border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                OAuth Google Login
              </CardTitle>
              <CardDescription>
                Konfigurasi Google OAuth agar pelanggan dan admin dapat login cepat dengan 1-klik menggunakan akun Google.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Status badge */}
              <div
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-4",
                  googleOAuthEnabled
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200"
                )}
              >
                {googleOAuthEnabled ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm">
                    Status Login Google:{" "}
                    <span className={cn(googleOAuthEnabled ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-600 dark:text-amber-400 font-bold")}>
                      {googleOAuthEnabled ? "Aktif & Siap Digunakan" : "Belum Aktif"}
                    </span>
                  </p>
                  <p className="text-xs opacity-80">
                    {googleOAuthEnabled
                      ? "Pengunjung & Admin dapat langsung login otomatis menggunakan tombol 'Masuk dengan Google'."
                      : "Isi Client ID & Client Secret dari Google Cloud Console di bawah ini untuk mengaktifkan."}
                  </p>
                </div>
              </div>

              {/* Redirect URI info */}
              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <span>Authorized Redirect URI (Salin ke Google Cloud Console)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input value={redirectUri} readOnly className="font-mono text-xs bg-background rounded-xl" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl shrink-0 font-semibold"
                    onClick={() => {
                      if (redirectUri) {
                        navigator.clipboard?.writeText(redirectUri);
                        toast.success("Redirect URI berhasil disalin ke clipboard");
                      }
                    }}
                  >
                    Salin URI
                  </Button>
                </div>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline pt-1"
                >
                  Buka Google Cloud Console <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* OAuth Form */}
              <Form {...googleOAuthForm}>
                <form onSubmit={googleOAuthForm.handleSubmit(onGoogleOAuthSubmit)} className="space-y-4">
                  <FormField
                    control={googleOAuthForm.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1 font-semibold">
                          <Key className="w-3.5 h-3.5 text-primary" /> Google OAuth Client ID
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="xxxxxxxxxx.apps.googleusercontent.com"
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Di Google Cloud Console → APIs &amp; Services → Credentials → OAuth 2.0 Client IDs → Client ID.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={googleOAuthForm.control}
                    name="clientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1 font-semibold">
                          <Lock className="w-3.5 h-3.5 text-primary" /> Google OAuth Client Secret
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showOAuthSecret ? "text" : "password"}
                              placeholder="Client Secret dari Google Cloud Console"
                              autoComplete="new-password"
                              {...field}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowOAuthSecret((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showOAuthSecret ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Client Secret disimpan aman di database toko.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="submit" disabled={isLoadingOAuth} className="rounded-xl font-semibold">
                      {isLoadingOAuth ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Simpan Konfigurasi OAuth
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!googleOAuthEnabled || isTestingOAuthRedirect}
                      className="rounded-xl font-semibold"
                      onClick={async () => {
                        setIsTestingOAuthRedirect(true);
                        try {
                          const url =
                            `/auth/google/login?redirect_to=${encodeURIComponent("/admin/dashboard")}&admin=1`;
                          const w = window.open(url, "_blank", "width=600,height=700,noopener,noreferrer");
                          if (!w) {
                            window.location.href = url;
                          }
                        } catch (e) {
                          toast.error("Gagal membuka halaman login Google");
                        } finally {
                          setTimeout(() => setIsTestingOAuthRedirect(false), 1500);
                        }
                      }}
                    >
                      {isTestingOAuthRedirect ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4 mr-2" />
                      )}
                      Test Redirect Login
                    </Button>
                  </div>
                </form>
              </Form>

              {/* Panduan singkat */}
              <details className="rounded-2xl border border-border p-4 group bg-muted/10">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 font-semibold text-sm">
                  <span>Panduan: Cara buat Client ID & Secret di Google Cloud Console</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    Klik untuk {googleOAuthEnabled ? "melihat ulang" : "membuka"} panduan
                  </span>
                </summary>
                <ol className="list-decimal list-inside mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>Buka <a className="text-primary hover:underline font-semibold" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer noopener">Google Cloud Console → Credentials</a></li>
                  <li>Pilih atau buat Project baru (nama: Sarah Bakery).</li>
                  <li>Klik <strong>"Create Credentials"</strong> → pilih <strong>"OAuth client ID"</strong>.</li>
                  <li>Jika diminta <strong>OAuth consent screen</strong>: pilih <em>External</em> → isi App name=Sarah Bakery, Support email=email Anda, App domain={typeof window !== "undefined" ? window.location.host : "(domain toko)"}. Save.</li>
                  <li>Kembali ke Credentials → Create OAuth client ID → pilih <strong>Application type: Web application</strong>.</li>
                  <li>Di bagian <strong>Authorized redirect URIs</strong> → klik <em>ADD URI</em> → tempel: <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{redirectUri}</code></li>
                  <li>Klik <strong>Create</strong> → salin Client ID & Client Secret ke form di atas → Simpan. Selesai!</li>
                </ol>
              </details>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
