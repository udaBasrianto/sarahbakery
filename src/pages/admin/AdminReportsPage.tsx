import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, parseISO } from "date-fns";
import { id as localeID } from "date-fns/locale";
import * as XLSX from "xlsx";
import { Download, Printer, FileText, TrendingUp, Receipt, Percent, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import AdminPageLayout from "./AdminPageLayout";

type OrderItem = {
  id?: string;
  name?: string;
  product_name?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  unit_price?: number;
  variant_name?: string;
  variant_value?: string;
};

type OrderRow = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  total_amount: number;
  items: OrderItem[];
};

const PPN_RATE = 0.11;

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n || 0);

const fmtNum = (n: number) => new Intl.NumberFormat("id-ID").format(n || 0);

type Preset = "today" | "7d" | "month" | "year" | "custom";

export default function AdminReportsPage() {
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState<string>(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [includeStatus, setIncludeStatus] = useState<string>("non-cancelled");
  const [pricingMode, setPricingMode] = useState<"inclusive" | "exclusive">("inclusive");

  const applyPreset = (p: Preset) => {
    setPreset(p);
    const now = new Date();
    if (p === "today") {
      setFrom(format(startOfDay(now), "yyyy-MM-dd"));
      setTo(format(endOfDay(now), "yyyy-MM-dd"));
    } else if (p === "7d") {
      setFrom(format(subDays(now, 6), "yyyy-MM-dd"));
      setTo(format(now, "yyyy-MM-dd"));
    } else if (p === "month") {
      setFrom(format(startOfMonth(now), "yyyy-MM-dd"));
      setTo(format(endOfMonth(now), "yyyy-MM-dd"));
    } else if (p === "year") {
      setFrom(format(startOfYear(now), "yyyy-MM-dd"));
      setTo(format(endOfYear(now), "yyyy-MM-dd"));
    }
  };

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["sales-report", from, to, includeStatus],
    queryFn: async () => {
      let q = apiClient
        .from("orders")
        .select("id, created_at, customer_name, customer_phone, status, total_amount, items")
        .gte("created_at", new Date(from + "T00:00:00").toISOString())
        .lte("created_at", new Date(to + "T23:59:59").toISOString())
        .order("created_at", { ascending: true });
      if (includeStatus === "non-cancelled") q = q.neq("status", "cancelled");
      else if (includeStatus !== "all") q = q.eq("status", includeStatus);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as OrderRow[];
    },
  });

  // ====== Calculations following Indonesian accounting practice ======
  const summary = useMemo(() => {
    const grossInclPPN = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    // Indonesian PPN 11%: assume harga termasuk PPN (inclusive) by default
    const dpp = pricingMode === "inclusive" ? grossInclPPN / (1 + PPN_RATE) : grossInclPPN;
    const ppn = pricingMode === "inclusive" ? grossInclPPN - dpp : grossInclPPN * PPN_RATE;
    const netto = dpp; // penjualan netto (DPP)
    const totalTrx = orders.length;
    const avg = totalTrx ? grossInclPPN / totalTrx : 0;
    return { grossInclPPN, dpp, ppn, netto, totalTrx, avg };
  }, [orders, pricingMode]);

  // Per produk
  const perProduct = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; bruto: number }>();
    orders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const name = it.product_name || it.name || "Produk";
        const qty = Number(it.quantity ?? it.qty ?? 1);
        const price = Number(it.price ?? it.unit_price ?? 0);
        const sub = qty * price;
        const k = name + (it.variant_value ? ` (${it.variant_value})` : "");
        const cur = map.get(k) || { name: k, qty: 0, bruto: 0 };
        cur.qty += qty;
        cur.bruto += sub;
        map.set(k, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.bruto - a.bruto);
  }, [orders]);

  // Per pelanggan
  const perCustomer = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; trx: number; bruto: number }>();
    orders.forEach((o) => {
      const k = (o.customer_phone || "") + "|" + (o.customer_name || "");
      const cur = map.get(k) || { name: o.customer_name, phone: o.customer_phone, trx: 0, bruto: 0 };
      cur.trx += 1;
      cur.bruto += Number(o.total_amount || 0);
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.bruto - a.bruto);
  }, [orders]);

  // Rekap harian
  const perDay = useMemo(() => {
    const map = new Map<string, { date: string; trx: number; bruto: number; dpp: number; ppn: number }>();
    orders.forEach((o) => {
      const d = format(parseISO(o.created_at), "yyyy-MM-dd");
      const cur = map.get(d) || { date: d, trx: 0, bruto: 0, dpp: 0, ppn: 0 };
      const bruto = Number(o.total_amount || 0);
      const dpp = pricingMode === "inclusive" ? bruto / (1 + PPN_RATE) : bruto;
      const ppn = pricingMode === "inclusive" ? bruto - dpp : bruto * PPN_RATE;
      cur.trx += 1;
      cur.bruto += bruto;
      cur.dpp += dpp;
      cur.ppn += ppn;
      map.set(d, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [orders, pricingMode]);

  // Per status
  const perStatus = useMemo(() => {
    const map = new Map<string, { status: string; trx: number; bruto: number }>();
    orders.forEach((o) => {
      const cur = map.get(o.status) || { status: o.status, trx: 0, bruto: 0 };
      cur.trx += 1;
      cur.bruto += Number(o.total_amount || 0);
      map.set(o.status, cur);
    });
    return Array.from(map.values());
  }, [orders]);

  const periodeLabel = `${format(parseISO(from), "d MMM yyyy", { locale: localeID })} – ${format(
    parseISO(to),
    "d MMM yyyy",
    { locale: localeID }
  )}`;

  // ====== Export Excel (multi-sheet) ======
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const ringkasan = [
      ["LAPORAN PENJUALAN — SARAH BAKERY"],
      ["Periode", periodeLabel],
      ["Status", includeStatus],
      ["Mode Harga", pricingMode === "inclusive" ? "Termasuk PPN" : "Belum termasuk PPN"],
      [],
      ["URAIAN", "JUMLAH (Rp)"],
      ["Penjualan Bruto (Termasuk PPN)", summary.grossInclPPN],
      ["Dasar Pengenaan Pajak (DPP)", summary.dpp],
      ["PPN Keluaran 11%", summary.ppn],
      ["Penjualan Netto", summary.netto],
      [],
      ["Jumlah Transaksi", summary.totalTrx],
      ["Rata-rata per Transaksi", summary.avg],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ringkasan), "Ringkasan");

    // Jurnal penjualan (per order)
    const jurnal = [
      ["No", "Tanggal", "No. Order", "Pelanggan", "No. HP", "Status", "DPP", "PPN 11%", "Total Bruto"],
      ...orders.map((o, i) => {
        const bruto = Number(o.total_amount || 0);
        const dpp = pricingMode === "inclusive" ? bruto / (1 + PPN_RATE) : bruto;
        const ppn = pricingMode === "inclusive" ? bruto - dpp : bruto * PPN_RATE;
        return [
          i + 1,
          format(parseISO(o.created_at), "dd/MM/yyyy HH:mm"),
          "#" + String(o.id).slice(0, 8).toUpperCase(),
          o.customer_name,
          o.customer_phone,
          o.status,
          dpp,
          ppn,
          bruto,
        ];
      }),
      ["", "", "", "", "", "TOTAL", summary.dpp, summary.ppn, summary.grossInclPPN],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(jurnal), "Jurnal Penjualan");

    // Per Produk
    const produk = [
      ["No", "Produk", "Qty", "Total Bruto"],
      ...perProduct.map((p, i) => [i + 1, p.name, p.qty, p.bruto]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(produk), "Per Produk");

    // Per Pelanggan
    const pelanggan = [
      ["No", "Pelanggan", "No. HP", "Jml Trx", "Total Bruto"],
      ...perCustomer.map((c, i) => [i + 1, c.name, c.phone, c.trx, c.bruto]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pelanggan), "Per Pelanggan");

    // Rekap Harian
    const harian = [
      ["Tanggal", "Jml Trx", "DPP", "PPN 11%", "Total Bruto"],
      ...perDay.map((d) => [d.date, d.trx, d.dpp, d.ppn, d.bruto]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(harian), "Rekap Harian");

    XLSX.writeFile(wb, `Laporan-Penjualan_${from}_sd_${to}.xlsx`);
  };

  const handlePrint = () => window.print();

  return (
    <AdminPageLayout>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Laporan Penjualan</h1>
          <p className="text-sm text-muted-foreground">
            Sesuai praktik akuntansi Indonesia (PPN 11% — UU HPP)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Cetak / PDF
          </Button>
          <Button onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-card rounded-2xl p-4 shadow-soft grid grid-cols-1 md:grid-cols-5 gap-3 print:hidden">
        <div className="md:col-span-1">
          <Label className="text-xs">Periode Cepat</Label>
          <Select value={preset} onValueChange={(v) => applyPreset(v as Preset)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hari Ini</SelectItem>
              <SelectItem value="7d">7 Hari Terakhir</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="year">Tahun Ini</SelectItem>
              <SelectItem value="custom">Kustom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Dari Tanggal</Label>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset("custom"); }} />
        </div>
        <div>
          <Label className="text-xs">Sampai Tanggal</Label>
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset("custom"); }} />
        </div>
        <div>
          <Label className="text-xs">Status Pesanan</Label>
          <Select value={includeStatus} onValueChange={setIncludeStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="non-cancelled">Semua kecuali dibatalkan</SelectItem>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Mode Harga</Label>
          <Select value={pricingMode} onValueChange={(v) => setPricingMode(v as "inclusive" | "exclusive")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inclusive">Termasuk PPN</SelectItem>
              <SelectItem value="exclusive">Belum termasuk PPN</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Header laporan untuk print */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Sarah Bakery — Laporan Penjualan</h1>
        <p>Periode: {periodeLabel}</p>
        <p>Mode Harga: {pricingMode === "inclusive" ? "Termasuk PPN" : "Belum termasuk PPN"}</p>
        <hr className="my-3" />
      </div>

      {/* Ringkasan Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={ShoppingBag} label="Penjualan Bruto" value={fmtIDR(summary.grossInclPPN)} color="bg-blue-500/10 text-blue-600" />
        <SummaryCard icon={TrendingUp} label="DPP (Netto)" value={fmtIDR(summary.dpp)} color="bg-green-500/10 text-green-600" />
        <SummaryCard icon={Percent} label="PPN Keluaran 11%" value={fmtIDR(summary.ppn)} color="bg-orange-500/10 text-orange-600" />
        <SummaryCard icon={Receipt} label="Jumlah Transaksi" value={fmtNum(summary.totalTrx)} color="bg-purple-500/10 text-purple-600" />
      </div>

      {/* Chart harian */}
      {perDay.length > 0 && (
        <div className="bg-card rounded-2xl p-4 shadow-soft print:hidden">
          <h2 className="font-display text-lg font-semibold mb-4">Tren Penjualan Harian</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perDay}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v: number) => fmtIDR(v)} />
                <Bar dataKey="bruto" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabs Detail */}
      <Tabs defaultValue="ringkasan" className="bg-card rounded-2xl p-4 shadow-soft">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="ringkasan"><FileText className="w-4 h-4 mr-1" />Ringkasan PPN</TabsTrigger>
          <TabsTrigger value="jurnal">Jurnal Penjualan</TabsTrigger>
          <TabsTrigger value="produk">Per Produk</TabsTrigger>
          <TabsTrigger value="pelanggan">Per Pelanggan</TabsTrigger>
          <TabsTrigger value="harian">Rekap Harian</TabsTrigger>
          <TabsTrigger value="status">Per Status</TabsTrigger>
        </TabsList>

        <TabsContent value="ringkasan" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Uraian</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell>Penjualan Bruto (Termasuk PPN)</TableCell><TableCell className="text-right">{fmtIDR(summary.grossInclPPN)}</TableCell></TableRow>
              <TableRow><TableCell>Dasar Pengenaan Pajak (DPP)</TableCell><TableCell className="text-right">{fmtIDR(summary.dpp)}</TableCell></TableRow>
              <TableRow><TableCell>PPN Keluaran 11%</TableCell><TableCell className="text-right">{fmtIDR(summary.ppn)}</TableCell></TableRow>
              <TableRow className="font-bold bg-secondary/30"><TableCell>Penjualan Netto</TableCell><TableCell className="text-right">{fmtIDR(summary.netto)}</TableCell></TableRow>
              <TableRow><TableCell>Jumlah Transaksi</TableCell><TableCell className="text-right">{fmtNum(summary.totalTrx)}</TableCell></TableRow>
              <TableRow><TableCell>Rata-rata per Transaksi</TableCell><TableCell className="text-right">{fmtIDR(summary.avg)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="jurnal" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>No. Order</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">DPP</TableHead>
                <TableHead className="text-right">PPN 11%</TableHead>
                <TableHead className="text-right">Total Bruto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const bruto = Number(o.total_amount || 0);
                const dpp = pricingMode === "inclusive" ? bruto / (1 + PPN_RATE) : bruto;
                const ppn = pricingMode === "inclusive" ? bruto - dpp : bruto * PPN_RATE;
                return (
                  <TableRow key={o.id}>
                    <TableCell className="whitespace-nowrap">{format(parseISO(o.created_at), "dd/MM/yy HH:mm")}</TableCell>
                    <TableCell className="font-mono text-xs">#{String(o.id).slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell>{o.customer_name}</TableCell>
                    <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{o.status}</span></TableCell>
                    <TableCell className="text-right">{fmtIDR(dpp)}</TableCell>
                    <TableCell className="text-right">{fmtIDR(ppn)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtIDR(bruto)}</TableCell>
                  </TableRow>
                );
              })}
              {orders.length > 0 && (
                <TableRow className="font-bold bg-secondary/30">
                  <TableCell colSpan={4}>TOTAL</TableCell>
                  <TableCell className="text-right">{fmtIDR(summary.dpp)}</TableCell>
                  <TableCell className="text-right">{fmtIDR(summary.ppn)}</TableCell>
                  <TableCell className="text-right">{fmtIDR(summary.grossInclPPN)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {orders.length === 0 && <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
        </TabsContent>

        <TabsContent value="produk" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Qty Terjual</TableHead>
                <TableHead className="text-right">Total Bruto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perProduct.map((p) => (
                <TableRow key={p.name}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-right">{fmtNum(p.qty)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtIDR(p.bruto)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {perProduct.length === 0 && <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
        </TabsContent>

        <TabsContent value="pelanggan" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pelanggan</TableHead>
                <TableHead>No. HP</TableHead>
                <TableHead className="text-right">Jml Trx</TableHead>
                <TableHead className="text-right">Total Bruto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perCustomer.map((c, i) => (
                <TableRow key={i}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell className="text-xs">{c.phone}</TableCell>
                  <TableCell className="text-right">{fmtNum(c.trx)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtIDR(c.bruto)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {perCustomer.length === 0 && <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
        </TabsContent>

        <TabsContent value="harian" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Jml Trx</TableHead>
                <TableHead className="text-right">DPP</TableHead>
                <TableHead className="text-right">PPN 11%</TableHead>
                <TableHead className="text-right">Total Bruto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perDay.map((d) => (
                <TableRow key={d.date}>
                  <TableCell>{format(parseISO(d.date), "EEE, d MMM yyyy", { locale: localeID })}</TableCell>
                  <TableCell className="text-right">{fmtNum(d.trx)}</TableCell>
                  <TableCell className="text-right">{fmtIDR(d.dpp)}</TableCell>
                  <TableCell className="text-right">{fmtIDR(d.ppn)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtIDR(d.bruto)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {perDay.length === 0 && <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
        </TabsContent>

        <TabsContent value="status" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Jml Trx</TableHead>
                <TableHead className="text-right">Total Bruto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perStatus.map((s) => (
                <TableRow key={s.status}>
                  <TableCell className="capitalize">{s.status}</TableCell>
                  <TableCell className="text-right">{fmtNum(s.trx)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtIDR(s.bruto)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {perStatus.length === 0 && <p className="text-center text-muted-foreground py-8">Tidak ada data</p>}
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground italic">
        Catatan: PPN dihitung dengan tarif 11% sesuai UU HPP. Apabila harga jual sudah termasuk PPN,
        DPP = Total / 1,11 dan PPN = Total − DPP. Laporan ini dapat dijadikan dasar pencatatan
        Jurnal Penjualan dan rekonsiliasi SPT Masa PPN.
      </p>

      {isLoading && <p className="text-center text-muted-foreground">Memuat data...</p>}
    </AdminPageLayout>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-card rounded-2xl p-4 shadow-soft">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}



