import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiClient } from "@/integrations/api/client";
import { useDefaultStoreId } from "@/hooks/useDefaultStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, Share2, Coins, Users, TrendingUp, Wallet, Gift, Sparkles,
} from "lucide-react";
import { SEO } from "@/components/SEO";

interface Affiliate {
  id: string;
  user_id: string;
  store_id: string;
  code?: string;
  referral_code?: string;
  total_points?: number;
  total_earnings?: number;
  total_referrals?: number;
  status: string;
  payment_method: string | null;
  payment_account: string | null;
  payment_name: string | null;
}

interface Settings {
  commission_rate: number;
  point_value: number;
  min_withdraw_points: number;
  is_active: boolean;
  terms: string | null;
}

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function AffiliatePage() {
  const navigate = useNavigate();
  const storeId = useDefaultStoreId();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);

  // withdraw dialog
  const [wdOpen, setWdOpen] = useState(false);
  const [wdPoints, setWdPoints] = useState("");
  const [wdMethod, setWdMethod] = useState("");
  const [wdAccount, setWdAccount] = useState("");
  const [wdName, setWdName] = useState("");
  const [wdSubmitting, setWdSubmitting] = useState(false);

  useEffect(() => {
    apiClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
    });
  }, [navigate]);

  useEffect(() => {
    if (!userId || !storeId) return;
    loadAll();
  }, [userId, storeId]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: aff }, { data: stg }] = await Promise.all([
      apiClient.from("affiliates").select("*").eq("user_id", userId!).maybeSingle(),
      apiClient.from("affiliate_settings").select("*").eq("store_id", storeId!).maybeSingle(),
    ]);
    setAffiliate(aff as Affiliate | null);
    setSettings(stg as Settings | null);
    if (aff) {
      const [{ data: c }, { data: w }, { data: t }, { data: r }] = await Promise.all([
        apiClient.from("affiliate_commissions").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }).limit(20),
        apiClient.from("affiliate_withdrawals").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }).limit(20),
        apiClient.from("point_transactions").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }).limit(20),
        apiClient.from("referrals").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setCommissions(c || []);
      setWithdrawals(w || []);
      setTransactions(t || []);
      setReferrals(r || []);
    }
    setLoading(false);
  };

  const joinAffiliate = async () => {
    if (!userId || !storeId) return;
    const genCode = "AFF" + String(userId).padStart(4, "0") + Math.random().toString(36).substring(2, 6).toUpperCase();
    const { error } = await apiClient.from("affiliates").insert({
      user_id: userId,
      store_id: storeId,
      code: genCode,
      referral_code: genCode,
    });
    if (error) {
      toast.error("Gagal mendaftar: " + error.message);
      return;
    }
    toast.success("Selamat! Anda terdaftar sebagai affiliate 🎉");
    loadAll();
  };

  const activeCode = affiliate?.referral_code || affiliate?.code || "";

  const referralLink = activeCode
    ? `${window.location.origin}/?ref=${activeCode}`
    : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    toast.success("Link disalin!");
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Belanja yuk!",
          text: `Pakai kode ${activeCode} untuk belanja di toko kami!`,
          url: referralLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const submitWithdraw = async () => {
    if (!affiliate || !settings) return;
    const pts = parseInt(wdPoints, 10);
    if (!pts || pts <= 0) return toast.error("Jumlah poin tidak valid");
    if (pts > affiliate.total_points) return toast.error("Poin tidak mencukupi");
    if (pts < settings.min_withdraw_points) return toast.error(`Minimum ${settings.min_withdraw_points} poin`);
    if (!wdMethod || !wdAccount.trim() || !wdName.trim()) return toast.error("Lengkapi data pembayaran");

    setWdSubmitting(true);
    const amount = pts * settings.point_value;
    const { error } = await apiClient.from("affiliate_withdrawals").insert({
      affiliate_id: affiliate.id,
      store_id: affiliate.store_id,
      points: pts,
      amount,
      payment_method: wdMethod,
      payment_account: wdAccount.trim(),
      payment_name: wdName.trim(),
    });
    setWdSubmitting(false);
    if (error) return toast.error("Gagal: " + error.message);
    // save payment info
    await apiClient.from("affiliates").update({
      payment_method: wdMethod, payment_account: wdAccount.trim(), payment_name: wdName.trim(),
    }).eq("id", affiliate.id);
    toast.success("Permintaan pencairan dikirim!");
    setWdOpen(false);
    setWdPoints("");
    loadAll();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[s] || "bg-gray-100 text-gray-800"}`}>{s}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // open payment dialog with prefilled values
  const openWithdraw = () => {
    if (affiliate?.payment_method) setWdMethod(affiliate.payment_method);
    if (affiliate?.payment_account) setWdAccount(affiliate.payment_account);
    if (affiliate?.payment_name) setWdName(affiliate.payment_name);
    setWdOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO
        title="Program Afiliasi & Komisi Mitra"
        description="Bergabung menjadi mitra afiliasi Sarah Bakery. Bagikan kode rujukan dan dapatkan poin komisi untuk setiap pembelian."
      />
      {/* Header */}
      <header className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-5 pb-16 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold">Program Affiliate</h1>
          <div className="w-9" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm opacity-80">Ajak teman, dapatkan komisi!</p>
            {settings && (
              <p className="text-xs opacity-70">
                Komisi {settings.commission_rate}% • 1 poin = {formatRp(settings.point_value)}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 -mt-10 space-y-4">
        {!affiliate ? (
          <div className="bg-card rounded-2xl shadow-lg p-6 text-center space-y-3">
            <Sparkles className="w-10 h-10 text-primary mx-auto" />
            <h2 className="font-display text-lg font-bold">Gabung Program Affiliate</h2>
            <p className="text-sm text-muted-foreground">
              Dapatkan komisi {settings?.commission_rate ?? 5}% dari setiap pesanan yang masuk lewat link Anda.
              Poin bisa dicairkan ke rekening/e-wallet.
            </p>
            {settings?.terms && (
              <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg whitespace-pre-wrap text-left">
                {settings.terms}
              </p>
            )}
            <Button onClick={joinAffiliate} className="w-full rounded-full">
              Daftar Sekarang
            </Button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="bg-card rounded-2xl shadow-lg p-4 grid grid-cols-3 gap-2">
              <Stat icon={<Coins className="w-5 h-5" />} label="Poin" value={String(affiliate.total_points ?? 0)} />
              <Stat icon={<TrendingUp className="w-5 h-5" />} label="Total Komisi" value={formatRp(affiliate.total_earnings ?? 0)} small />
              <Stat icon={<Users className="w-5 h-5" />} label="Referral" value={String(affiliate.total_referrals ?? 0)} />
            </div>

            {/* Referral link */}
            <div className="bg-card rounded-2xl p-4 space-y-3 shadow-soft">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Kode Referral Anda</p>
                <p className="font-mono text-2xl font-bold tracking-widest text-primary">
                  {activeCode}
                </p>
              </div>
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={copyLink}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="icon" onClick={shareLink}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Bagikan link ini. Setiap pesanan dari link Anda otomatis menghasilkan komisi setelah disetujui admin.
              </p>
            </div>

            {/* Withdraw */}
            <div className="bg-card rounded-2xl p-4 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Saldo Poin</p>
                  <p className="font-display text-2xl font-bold">
                    {affiliate.total_points ?? 0} <span className="text-sm text-muted-foreground font-normal">
                      ≈ {formatRp((affiliate.total_points ?? 0) * (settings?.point_value || 0))}
                    </span>
                  </p>
                </div>
                <Dialog open={wdOpen} onOpenChange={setWdOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={openWithdraw} disabled={(affiliate.total_points ?? 0) < (settings?.min_withdraw_points || 0)}>
                      <Wallet className="w-4 h-4 mr-1" /> Cairkan
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Pencairan Poin</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>Jumlah Poin</Label>
                        <Input type="number" value={wdPoints} onChange={(e) => setWdPoints(e.target.value)}
                          placeholder={`Min ${settings?.min_withdraw_points || 100}`} />
                        {wdPoints && settings && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ≈ {formatRp((parseInt(wdPoints, 10) || 0) * settings.point_value)}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>Metode</Label>
                        <Select value={wdMethod} onValueChange={setWdMethod}>
                          <SelectTrigger><SelectValue placeholder="Pilih metode" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BCA">Bank BCA</SelectItem>
                            <SelectItem value="BRI">Bank BRI</SelectItem>
                            <SelectItem value="BNI">Bank BNI</SelectItem>
                            <SelectItem value="Mandiri">Bank Mandiri</SelectItem>
                            <SelectItem value="DANA">DANA</SelectItem>
                            <SelectItem value="OVO">OVO</SelectItem>
                            <SelectItem value="GoPay">GoPay</SelectItem>
                            <SelectItem value="ShopeePay">ShopeePay</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Nomor Rekening/HP</Label>
                        <Input value={wdAccount} onChange={(e) => setWdAccount(e.target.value)} />
                      </div>
                      <div>
                        <Label>Nama Pemilik</Label>
                        <Input value={wdName} onChange={(e) => setWdName(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={submitWithdraw} disabled={wdSubmitting} className="w-full">
                        {wdSubmitting ? "Memproses..." : "Ajukan Pencairan"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {settings && (affiliate.total_points ?? 0) < settings.min_withdraw_points && (
                <p className="text-xs text-muted-foreground">
                  Minimum pencairan {settings.min_withdraw_points} poin.
                </p>
              )}
            </div>

            {/* Tabs history */}
            <Tabs defaultValue="commissions" className="bg-card rounded-2xl p-4 shadow-soft">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="commissions">Komisi</TabsTrigger>
                <TabsTrigger value="withdrawals">Pencairan</TabsTrigger>
                <TabsTrigger value="transactions">Poin</TabsTrigger>
              </TabsList>
              <TabsContent value="commissions" className="space-y-2 mt-3">
                {commissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Belum ada komisi</p>
                ) : commissions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{formatRp(c.commission_amount)} ({c.points} poin)</p>
                      <p className="text-xs text-muted-foreground">
                        Order {formatRp(c.order_amount)} • {new Date(c.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    {statusBadge(c.status)}
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="withdrawals" className="space-y-2 mt-3">
                {withdrawals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Belum ada pencairan</p>
                ) : withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{formatRp(w.amount)} ({w.points} poin)</p>
                      <p className="text-xs text-muted-foreground">
                        {w.payment_method} • {w.payment_account} • {new Date(w.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    {statusBadge(w.status)}
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="transactions" className="space-y-2 mt-3">
                {transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Belum ada transaksi</p>
                ) : transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{t.description || t.type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("id-ID")}</p>
                    </div>
                    <span className={`font-bold ${t.points >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {t.points >= 0 ? "+" : ""}{t.points}
                    </span>
                  </div>
                ))}
              </TabsContent>
            </Tabs>

            <Link to="/dashboard" className="block text-center text-sm text-primary py-2">
              Kembali ke Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, small }: { icon: React.ReactNode; label: string; value: string; small?: boolean }) {
  return (
    <div className="text-center p-2">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1 text-primary">
        {icon}
      </div>
      <p className={`font-bold text-foreground ${small ? "text-sm" : "text-lg"}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}


