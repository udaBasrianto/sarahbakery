import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Settings, User, Lock, Phone, Save, Loader2, Bot, Palette, Check, Shield, Key, ExternalLink, AlertCircle, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const profileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  email: z.string().email("Email tidak valid"),
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
});

const googleOAuthSchema = z.object({
  clientId: z.string().min(5, "Client ID minimal 5 karakter").optional().or(z.literal("")),
  clientSecret: z.string().min(5, "Client Secret minimal 5 karakter").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type WhatsappFormValues = z.infer<typeof whatsappSchema>;
type GoogleOAuthFormValues = z.infer<typeof googleOAuthSchema>;

export default function AdminSettingsPage() {
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingWhatsapp, setIsLoadingWhatsapp] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [isLoadingChatbot, setIsLoadingChatbot] = useState(false);
  const [showOAuthSecret, setShowOAuthSecret] = useState(false);
  const [isLoadingOAuth, setIsLoadingOAuth] = useState(false);
  const [isTestingOAuthRedirect, setIsTestingOAuthRedirect] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);

  // Appearance (font, text size, theme)
  const { appearance, setAppearance, refetch: refetchAppearance } = useAppearance();
  const [draft, setDraft] = useState<Appearance>(appearance);
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);

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
      const rows: { key: string; value: string }[] = [
        { key: SETTING_KEYS.font, value: draft.font },
        { key: SETTING_KEYS.textSize, value: draft.textSize },
        { key: SETTING_KEYS.theme, value: draft.theme },
      ];

      for (const row of rows) {
        const { data: existing } = await apiClient
          .from("settings")
          .select("id")
          .eq("key", row.key)
          .maybeSingle();

        const { error } = existing
          ? await apiClient.from("settings").update({ value: row.value }).eq("key", row.key)
          : await apiClient.from("settings").insert(row);
        if (error) throw error;
      }

      setAppearance(draft);
      cacheAppearance(draft);
      toast.success("Tampilan berhasil disimpan");
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
    toast.info("Tampilan direset ke default (belum disimpan)");
  };


  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
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
    },
  });

  const googleOAuthForm = useForm<GoogleOAuthFormValues>({
    resolver: zodResolver(googleOAuthSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
    },
  });

  useEffect(() => {
    const loadData = async () => {
      // Load current user
      const { data: { user } } = await apiClient.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        profileForm.setValue("email", user.email || "");
        profileForm.setValue("name", user.user_metadata?.name || "Admin");
      }

      // Load WhatsApp number from settings
      const { data: settings } = await apiClient
        .from("settings")
        .select("value")
        .eq("key", "whatsapp_number")
        .maybeSingle();

      if (settings) {
        whatsappForm.setValue("whatsappNumber", settings.value);
      }

      const { data: chatbotSetting } = await apiClient
        .from("settings")
        .select("value")
        .eq("key", "chatbot_enabled")
        .maybeSingle();
      if (chatbotSetting) {
        setChatbotEnabled(chatbotSetting.value !== "false");
      }

      // Load Google OAuth settings
      const [{ data: cidRow }, { data: secRow }] = await Promise.all([
        apiClient
          .from("settings")
          .select("value")
          .eq("key", "google_oauth_client_id")
          .maybeSingle(),
        apiClient
          .from("settings")
          .select("value")
          .eq("key", "google_oauth_client_secret")
          .maybeSingle(),
      ]);
      const cid = cidRow?.value ?? "";
      const sec = secRow?.value ?? "";
      googleOAuthForm.setValue("clientId", cid);
      googleOAuthForm.setValue("clientSecret", sec);
      setGoogleOAuthEnabled(!!cid && !!sec);
    };

    loadData();
  }, [profileForm, whatsappForm, googleOAuthForm]);

  const onToggleChatbot = async (enabled: boolean) => {
    setIsLoadingChatbot(true);
    setChatbotEnabled(enabled);
    try {
      const { data: existing } = await apiClient
        .from("settings")
        .select("id")
        .eq("key", "chatbot_enabled")
        .maybeSingle();

      const value = enabled ? "true" : "false";
      const { error } = existing
        ? await apiClient.from("settings").update({ value }).eq("key", "chatbot_enabled")
        : await apiClient.from("settings").insert({ key: "chatbot_enabled", value });

      if (error) throw error;
      toast.success(enabled ? "Chatbot diaktifkan" : "Chatbot disembunyikan");
    } catch (error: unknown) {
      setChatbotEnabled(!enabled);
      const msg = error instanceof Error ? error.message : "Gagal memperbarui pengaturan chatbot";
      toast.error(msg);
    } finally {
      setIsLoadingChatbot(false);
    }
  };

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsLoadingProfile(true);
    try {
      const { error } = await apiClient.auth.updateUser({
        email: data.email,
        data: { name: data.name },
      });

      if (error) throw error;

      toast.success("Profil berhasil diperbarui");
      
      if (data.email !== userEmail) {
        toast.info("Email verifikasi telah dikirim ke email baru");
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
      // Verify current password by re-authenticating
      const { error: signInError } = await apiClient.auth.signInWithPassword({
        email: userEmail,
        password: data.currentPassword,
      });

      if (signInError) {
        toast.error("Password saat ini salah");
        return;
      }

      // Update password
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
      const { error } = await apiClient
        .from("settings")
        .update({ value: data.whatsappNumber })
        .eq("key", "whatsapp_number");

      if (error) throw error;

      toast.success("Nomor WhatsApp berhasil diperbarui");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Gagal memperbarui nomor WhatsApp";
      toast.error(errorMessage);
    } finally {
      setIsLoadingWhatsapp(false);
    }
  };

  const onGoogleOAuthSubmit = async (data: GoogleOAuthFormValues) => {
    setIsLoadingOAuth(true);
    try {
      const rows: { key: string; value: string }[] = [
        { key: "google_oauth_client_id", value: data.clientId ?? "" },
        { key: "google_oauth_client_secret", value: data.clientSecret ?? "" },
      ];
      for (const row of rows) {
        const { data: existing } = await apiClient
          .from("settings")
          .select("id")
          .eq("key", row.key)
          .maybeSingle();
        const { error } = existing
          ? await apiClient.from("settings").update({ value: row.value }).eq("key", row.key)
          : await apiClient.from("settings").insert({ ...row, store_id: 1 });
        if (error) throw error;
      }
      const enabled = !!(data.clientId && data.clientSecret);
      setGoogleOAuthEnabled(enabled);
      toast.success(
        enabled
          ? "Konfigurasi Google OAuth berhasil disimpan! Login Google kini aktif."
          : "Konfigurasi Google OAuth disimpan (nonaktif — salah satu credential kosong)."
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Gagal menyimpan konfigurasi Google OAuth";
      toast.error(errorMessage);
    } finally {
      setIsLoadingOAuth(false);
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
        <div className="p-2 rounded-xl bg-primary/10">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Pengaturan</h1>
          <p className="text-muted-foreground text-sm">Kelola profil, password, dan pengaturan toko</p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Tampilan</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Password</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="gap-2">
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">Chatbot</span>
          </TabsTrigger>
          <TabsTrigger value="oauth" className="gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">OAuth</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profil Admin
              </CardTitle>
              <CardDescription>
                Ubah nama dan email akun admin Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama</FormLabel>
                        <FormControl>
                          <Input placeholder="Nama lengkap" {...field} />
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoadingProfile}>
                    {isLoadingProfile ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Simpan Perubahan
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Ubah Password
              </CardTitle>
              <CardDescription>
                Perbarui password akun admin Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password Saat Ini</FormLabel>
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
                        <FormLabel>Password Baru</FormLabel>
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
                        <FormLabel>Konfirmasi Password Baru</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoadingPassword}>
                    {isLoadingPassword ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Ubah Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Nomor WhatsApp Toko
              </CardTitle>
              <CardDescription>
                Nomor WhatsApp yang akan digunakan untuk menerima pesanan dari pelanggan
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
                        <FormLabel>Nomor WhatsApp</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="6281234567890" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Format: kode negara + nomor (contoh: 6281234567890)
                        </p>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoadingWhatsapp}>
                    {isLoadingWhatsapp ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Simpan Nomor WhatsApp
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chatbot Tab */}
        <TabsContent value="chatbot">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Widget Chatbot
              </CardTitle>
              <CardDescription>
                Aktifkan atau sembunyikan widget Sarah Assistant di halaman pelanggan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="space-y-1">
                  <Label htmlFor="chatbot-toggle" className="text-base font-medium">
                    Tampilkan widget chatbot
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Jika dinonaktifkan, tombol chatbot tidak akan muncul di halaman pelanggan.
                  </p>
                </div>
                <Switch
                  id="chatbot-toggle"
                  checked={chatbotEnabled}
                  onCheckedChange={onToggleChatbot}
                  disabled={isLoadingChatbot}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google OAuth Tab */}
        <TabsContent value="oauth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                OAuth Google
              </CardTitle>
              <CardDescription>
                Konfigurasi Google OAuth agar pengguna (pelanggan & admin) bisa login dengan akun Google.
                Setelah Client ID & Client Secret diisi, tombol "Lanjutkan dengan Google" akan aktif di halaman login.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Status badge */}
              <div
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4",
                  googleOAuthEnabled
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900"
                    : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900"
                )}
              >
                {googleOAuthEnabled ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <p className="font-medium text-sm text-foreground">
                    Status Login Google:{" "}
                    <span className={cn(googleOAuthEnabled ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400")}>
                      {googleOAuthEnabled ? "Aktif" : "Belum Aktif"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {googleOAuthEnabled
                      ? "Pengguna bisa login & register otomatis dengan akun Google."
                      : "Isi Client ID & Client Secret dari Google Cloud Console di bawah ini untuk mengaktifkan."}
                  </p>
                </div>
              </div>

              {/* Redirect URI info */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span>Salin URI ini ke Authorized Redirect URIs di Google Cloud Console</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input value={redirectUri} readOnly className="font-mono text-xs bg-background" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (redirectUri) {
                        navigator.clipboard?.writeText(redirectUri);
                        toast.success("Redirect URI disalin ke clipboard");
                      }
                    }}
                  >
                    Salin
                  </Button>
                </div>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Buka Google Cloud Console <ExternalLink className="w-3 h-3" />
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
                        <FormLabel className="flex items-center gap-1">
                          <Key className="w-3.5 h-3.5" /> Google OAuth Client ID
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
                        <FormLabel className="flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> Google OAuth Client Secret
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
                          Client Secret disimpan terenkripsi di database toko. Tidak pernah dikirim ke browser.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="submit" disabled={isLoadingOAuth}>
                      {isLoadingOAuth ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Simpan Konfigurasi
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!googleOAuthEnabled || isTestingOAuthRedirect}
                      onClick={async () => {
                        setIsTestingOAuthRedirect(true);
                        try {
                          const url =
                            `/auth/google/login?redirect_to=${encodeURIComponent("/admin/dashboard")}&admin=1`;
                          const w = window.open(url, "_blank", "width=600,height=700,noopener,noreferrer");
                          if (!w) {
                            // Fallback: popup blocked → navigate current tab
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
                      Test Redirect
                    </Button>
                  </div>
                </form>
              </Form>

              {/* Panduan singkat */}
              <details className="rounded-xl border border-border p-4 group">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 font-medium text-sm">
                  <span>Panduan: Cara buat Client ID & Secret di Google Cloud Console</span>
                  <span className="text-muted-foreground text-xs">
                    Klik untuk {googleOAuthEnabled ? "melihat ulang" : "membuka"} panduan
                  </span>
                </summary>
                <ol className="list-decimal list-inside mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>Buka <a className="text-primary hover:underline" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer noopener">Google Cloud Console → Credentials</a></li>
                  <li>Pilih / buat Project baru (nama: Sarah Bakery).</li>
                  <li>Klik <strong>"Create Credentials"</strong> → pilih <strong>"OAuth client ID"</strong>.</li>
                  <li>Jika diminta <strong>OAuth consent screen</strong>: pilih <em>External</em> → isi App name=Sarah Bakery, Support email=email Anda, App domain={typeof window !== "undefined" ? window.location.host : "(domain toko)"}. Authorized domains tambahkan domain public (jika production). Save.</li>
                  <li>Kembali ke Credentials → Create OAuth client ID → pilih <strong>Application type: Web application</strong>.</li>
                  <li>Name: Sarah Bakery Web App.</li>
                  <li>
                    Di bagian <strong>Authorized redirect URIs</strong> → klik <em>ADD URI</em> → paste: <code className="font-mono text-xs bg-muted px-1 rounded">{redirectUri}</code>
                  </li>
                  <li>Klik <strong>Create</strong> → akan muncul popup dengan Client ID & Client Secret. Salin & paste kedua nilai ke form di atas → Simpan Konfigurasi.</li>
                  <li>Status di atas otomatis berubah menjadi <span className="text-emerald-700 dark:text-emerald-400 font-medium">Aktif</span> ✅. Selesai.</li>
                </ol>
              </details>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          {/* Fonts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Preset Font
              </CardTitle>
              <CardDescription>
                Pilih salah satu dari 10 kombinasi Google Font. Perubahan langsung terlihat sebagai pratinjau.
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
          <Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Preset Warna Tema</CardTitle>
              <CardDescription>
                Warna diterapkan ke seluruh komponen melalui token desain (primary, accent, background).
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
          <Card>
            <CardHeader>
              <CardTitle>Pratinjau</CardTitle>
              <CardDescription>
                Font: {getFontPreset(draft.font).label} · Ukuran: {draft.textSize} · Tema: {draft.theme}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="font-display text-2xl font-bold text-foreground">Bolu Panggang Premium</h3>
                <p className="text-sm text-muted-foreground">
                  Tekstur lembut dengan rasa murni, dibuat segar setiap hari oleh Sarah Bakery.
                </p>
                <div className="flex gap-2">
                  <Button size="sm">Tambah ke Keranjang</Button>
                  <Button size="sm" variant="secondary">Detail</Button>
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Promo
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveAppearance} disabled={isSavingAppearance}>
                  {isSavingAppearance ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Simpan Tampilan
                </Button>
                <Button variant="outline" onClick={resetAppearance} disabled={isSavingAppearance}>
                  Reset ke Default
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Perubahan berlaku untuk semua pengunjung setelah disimpan.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}



