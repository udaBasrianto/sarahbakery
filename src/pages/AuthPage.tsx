import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "@/integrations/api/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, Mail, Lock, User } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Email tidak valid");
const passwordSchema = z.string().min(6, "Password minimal 6 karakter");

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});

  // Handle oauth_error query param (from callback)
  useEffect(() => {
    const oauthError = searchParams.get("oauth_error");
    if (oauthError) {
      toast.error(`Login Google gagal: ${decodeURIComponent(oauthError)}`);
      // Clear the param from URL without reloading
      searchParams.delete("oauth_error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch Google OAuth enabled status
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/auth/google/config", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          setGoogleOAuthEnabled(!!json?.data?.enabled);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await apiClient.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkSession();

    const { data: { subscription } } = apiClient.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; name?: string } = {};
    
    try {
      emailSchema.parse(formData.email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(formData.password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (!isLogin && !formData.name.trim()) {
      newErrors.name = "Nama wajib diisi";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await apiClient.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          if (error.message === "Invalid login credentials") {
            toast.error("Email atau password salah");
          } else if (error.message === "Email not confirmed") {
            toast.error("Silakan verifikasi email Anda terlebih dahulu");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("Login berhasil!");
      } else {
        const redirectUrl = `${window.location.origin}/`;

        const { error } = await apiClient.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              name: formData.name,
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Email sudah terdaftar. Silakan login.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        // Update profile with name
        const { data: { session } } = await apiClient.auth.getSession();
        if (session) {
          await apiClient
            .from("profiles")
            .update({ name: formData.name })
            .eq("user_id", session.user.id);
        }

        toast.success("Pendaftaran berhasil! Silakan cek email untuk verifikasi.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 hover:bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-foreground">
            {isLogin ? "Masuk" : "Daftar"}
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-4xl mx-auto mb-4">
            🧁
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">Sarah Bakery</h2>
          <p className="text-muted-foreground mt-1">
            {isLogin ? "Selamat datang kembali!" : "Buat akun baru"}
          </p>
        </div>

        {/* Google Sign In */}
        <Button
          type="button"
          variant="outline"
          className="w-full mb-4"
          disabled={isLoading || !googleOAuthEnabled}
          onClick={async () => {
            setIsLoading(true);
            try {
              // Check config for better error if not enabled
              const checkRes = await fetch("/auth/google/config", { credentials: "include" });
              if (!checkRes.ok) throw new Error("Gagal cek konfigurasi Google OAuth");
              const cfg = await checkRes.json();
              if (!cfg?.data?.enabled) {
                toast.error("Login Google belum diatur admin. Silakan gunakan email/password untuk login.");
                return;
              }
              // Navigate to backend google login endpoint → 302 redirect to Google
              const redirectTo = `${window.location.origin}/dashboard`;
              const url =
                `/auth/google/login?redirect_to=${encodeURIComponent("/dashboard")}`;
              window.location.href = url;
              // Not returning, browser will navigate away
            } catch (err: unknown) {
              toast.error(
                err instanceof Error ? err.message : "Gagal masuk dengan Google"
              );
              setIsLoading(false);
            }
          }}
          title={googleOAuthEnabled ? undefined : "Login Google belum diatur admin. Gunakan email/password."}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {!googleOAuthEnabled ? "Login Google belum diaktifkan" : "Lanjutkan dengan Google"}
        </Button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">atau</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Masukkan nama Anda"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-10"
                />
              </div>
              {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10"
              />
            </div>
            {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 6 karakter"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : isLogin ? (
              "Masuk"
            ) : (
              "Daftar"
            )}
          </Button>

          {isLogin && (
            <div className="text-center">
              <button
                type="button"
                onClick={async () => {
                  if (!formData.email) {
                    toast.error("Masukkan email Anda terlebih dahulu");
                    return;
                  }
                  try {
                    emailSchema.parse(formData.email);
                  } catch {
                    toast.error("Email tidak valid");
                    return;
                  }
                  setIsLoading(true);
                  const { error } = await apiClient.auth.resetPasswordForEmail(formData.email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  setIsLoading(false);
                  if (error) {
                    toast.error(error.message);
                  } else {
                    toast.success("Link reset password telah dikirim ke email Anda");
                  }
                }}
                className="text-sm text-primary hover:underline"
              >
                Lupa password?
              </button>
            </div>
          )}
        </form>

        {/* Toggle */}
        <div className="text-center mt-6">
          <p className="text-muted-foreground">
            {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? "Daftar sekarang" : "Masuk"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}



