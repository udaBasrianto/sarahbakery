import { useEffect, useState } from "react";
import { apiClient } from "@/integrations/api/client";
import { useAdminStoreId } from "@/hooks/useDefaultStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, Wallet, Coins, Settings as SettingsIcon } from "lucide-react";

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function AdminAffiliatesPage() {
  const storeId = useAdminStoreId();
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // settings form
  const [rate, setRate] = useState("5");
  const [pointValue, setPointValue] = useState("100");
  const [minWd, setMinWd] = useState("100");
  const [isActive, setIsActive] = useState(true);
  const [terms, setTerms] = useState("");

  useEffect(() => {
    if (!storeId) return;
    load();
  }, [storeId]);

  const load = async () => {
    setLoading(true);
    const [{ data: a }, { data: c }, { data: w }, { data: s }] = await Promise.all([
      apiClient.from("affiliates").select("*").eq("store_id", storeId!).order("total_earnings", { ascending: false }),
      apiClient.from("affiliate_commissions").select("*").eq("store_id", storeId!).order("created_at", { ascending: false }).limit(100),
      apiClient.from("affiliate_withdrawals").select("*").eq("store_id", storeId!).order("created_at", { ascending: false }).limit(100),
      apiClient.from("affiliate_settings").select("*").eq("store_id", storeId!).maybeSingle(),
    ]);
    setAffiliates(a || []);
    setCommissions(c || []);
    setWithdrawals(w || []);
    setSettings(s);
    if (s) {
      setRate(String(s.commission_rate));
      setPointValue(String(s.point_value));
      setMinWd(String(s.min_withdraw_points));
      setIsActive(s.is_active);
      setTerms(s.terms || "");
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!storeId) return;
    const payload = {
      store_id: storeId,
      commission_rate: parseFloat(rate) || 5,
      point_value: parseFloat(pointValue) || 100,
      min_withdraw_points: parseInt(minWd, 10) || 100,
      is_active: isActive,
      terms: terms || null,
    };
    const { error } = settings
      ? await apiClient.from("affiliate_settings").update(payload).eq("id", settings.id)
      : await apiClient.from("affiliate_settings").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Pengaturan disimpan");
    load();
  };

  const updateCommission = async (id: string, status: string) => {
    const { error } = await apiClient.from("affiliate_commissions").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Komisi ${status}`);
    load();
  };

  const updateWithdrawal = async (id: string, status: string) => {
    const { error } = await apiClient.from("affiliate_withdrawals")
      .update({ status, processed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Pencairan ${status}`);
    load();
  };

  if (loading) {
    return <div className="p-6">Memuat...</div>;
  }

  const totalPaid = withdrawals.filter(w => w.status === "paid").reduce((s, w) => s + Number(w.amount), 0);
  const pendingWd = withdrawals.filter(w => w.status === "pending").length;
  const pendingComm = commissions.filter(c => c.status === "pending").length;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <h1 className="font-display text-2xl font-bold mb-6">Program Affiliate</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Users />} label="Total Affiliate" value={affiliates.length.toString()} />
        <StatCard icon={<Coins />} label="Komisi Pending" value={pendingComm.toString()} />
        <StatCard icon={<Wallet />} label="Pencairan Pending" value={pendingWd.toString()} />
        <StatCard icon={<Wallet />} label="Total Dibayar" value={formatRp(totalPaid)} />
      </div>

      <Tabs defaultValue="commissions">
        <TabsList>
          <TabsTrigger value="commissions">Komisi</TabsTrigger>
          <TabsTrigger value="withdrawals">Pencairan</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliate</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="w-4 h-4 mr-1" />Pengaturan</TabsTrigger>
        </TabsList>

        <TabsContent value="commissions" className="space-y-2 mt-4">
          {commissions.length === 0 && <p className="text-muted-foreground">Belum ada komisi.</p>}
          {commissions.map((c) => {
            const aff = affiliates.find(a => a.id === c.affiliate_id);
            return (
              <div key={c.id} className="bg-card border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{aff?.referral_code || "—"} • {formatRp(c.commission_amount)} ({c.points} pts)</p>
                  <p className="text-xs text-muted-foreground">
                    Order {formatRp(c.order_amount)} • {new Date(c.created_at).toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-muted">{c.status}</span>
                  {c.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => updateCommission(c.id, "approved")}>Setujui</Button>
                      <Button size="sm" variant="outline" onClick={() => updateCommission(c.id, "rejected")}>Tolak</Button>
                    </>
                  )}
                  {c.status === "approved" && (
                    <Button size="sm" variant="outline" onClick={() => updateCommission(c.id, "paid")}>Tandai Paid</Button>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-2 mt-4">
          {withdrawals.length === 0 && <p className="text-muted-foreground">Belum ada pencairan.</p>}
          {withdrawals.map((w) => {
            const aff = affiliates.find(a => a.id === w.affiliate_id);
            return (
              <div key={w.id} className="bg-card border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{aff?.referral_code || "—"} • {formatRp(w.amount)} ({w.points} pts)</p>
                  <p className="text-xs text-muted-foreground">
                    {w.payment_method} • {w.payment_account} a/n {w.payment_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString("id-ID")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-muted">{w.status}</span>
                  {w.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => updateWithdrawal(w.id, "approved")}>Setujui</Button>
                      <Button size="sm" variant="outline" onClick={() => updateWithdrawal(w.id, "rejected")}>Tolak</Button>
                    </>
                  )}
                  {w.status === "approved" && (
                    <Button size="sm" onClick={() => updateWithdrawal(w.id, "paid")}>Tandai Sudah Bayar</Button>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="affiliates" className="space-y-2 mt-4">
          {affiliates.length === 0 && <p className="text-muted-foreground">Belum ada affiliate.</p>}
          {affiliates.map((a) => (
            <div key={a.id} className="bg-card border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono font-bold">{a.referral_code}</p>
                <p className="text-xs text-muted-foreground">
                  {a.total_referrals} referral • {a.total_points} poin • {formatRp(a.total_earnings)}
                </p>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-muted">{a.status}</span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="bg-card border rounded-lg p-4 space-y-4 max-w-xl">
            <div className="flex items-center justify-between">
              <Label>Program Aktif</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <div>
              <Label>Komisi (%)</Label>
              <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
            <div>
              <Label>Nilai 1 Poin (Rp)</Label>
              <Input type="number" value={pointValue} onChange={(e) => setPointValue(e.target.value)} />
            </div>
            <div>
              <Label>Minimum Pencairan (poin)</Label>
              <Input type="number" value={minWd} onChange={(e) => setMinWd(e.target.value)} />
            </div>
            <div>
              <Label>Syarat & Ketentuan</Label>
              <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={5} />
            </div>
            <Button onClick={saveSettings} className="w-full">Simpan</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="text-primary mb-2">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}


