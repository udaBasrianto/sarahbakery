import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/integrations/api/client";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Shield } from "lucide-react";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);

  useEffect(() => {
    const oauthError = searchParams.get("oauth_error");
    if (oauthError) {
      toast.error(`Login Google gagal: ${decodeURIComponent(oauthError)}`);
      searchParams.delete("oauth_error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/auth/google/config", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          setGoogleOAuthEnabled(!!json?.data?.enabled);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error("Mohon isi email dan password");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await apiClient.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;

      toast.success("Login berhasil!");
      navigate("/admin/dashboard");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Gagal login";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary mx-auto flex items-center justify-center text-4xl mb-4 shadow-card">
            🧁
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Sarah Bakery
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Admin Dashboard
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-card rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-2">
            <Lock className="w-5 h-5 text-primary" />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@sarahbakery.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-full"
          >
            {isLoading ? "Memproses..." : "Masuk"}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">atau</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isLoading || !googleOAuthEnabled}
            onClick={async () => {
              setIsLoading(true);
              try {
                const url =
                  `/auth/google/login?redirect_to=${encodeURIComponent("/admin/dashboard")}&admin=1`;
                window.location.href = url;
              } catch (err: unknown) {
                toast.error(
                  err instanceof Error ? err.message : "Gagal masuk dengan Google"
                );
                setIsLoading(false);
              }
            }}
            title={googleOAuthEnabled ? undefined : "Login Google belum diatur. Silakan login dengan email/password terlebih dahulu, lalu atur OAuth di Pengaturan → OAuth."}
          >
            <Shield className="w-4 h-4 mr-2 text-primary" />
            <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {!googleOAuthEnabled ? "Google Admin (belum diatur)" : "Masuk sebagai Admin dengan Google"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Kembali ke{" "}
          <button
            onClick={() => navigate("/")}
            className="text-primary hover:underline"
          >
            Toko
          </button>
        </p>
      </div>
    </div>
  );
}


