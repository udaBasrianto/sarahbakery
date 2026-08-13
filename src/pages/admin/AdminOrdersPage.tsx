import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { Loader2, Phone, MapPin, MessageCircle, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AdminPageLayout from "./AdminPageLayout";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  items: OrderItem[];
  total_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  order_type?: string | null;
  preorder_date?: string | null;
  dp_amount?: number | null;
  dp_status?: string | null;
  custom_details?: string | null;
  custom_image_url?: string | null;
}

const statusOptions = [
  { value: "pending", label: "Pending", color: "bg-orange-100 text-orange-700" },
  { value: "processing", label: "Diproses", color: "bg-blue-100 text-blue-700" },
  { value: "completed", label: "Selesai", color: "bg-green-100 text-green-700" },
  { value: "cancelled", label: "Dibatalkan", color: "bg-red-100 text-red-700" },
];

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: async () => {
      let query = apiClient
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((order) => ({
        ...order,
        items: order.items as unknown as OrderItem[],
        customer_address: order.customer_address || null,
        notes: order.notes || null,
      })) as Order[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await apiClient
        .from("orders")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Status pesanan diperbarui");
    },
    onError: () => {
      toast.error("Gagal memperbarui status");
    },
  });

  const updateDpMutation = useMutation({
    mutationFn: async ({ id, dp_status }: { id: string; dp_status: string }) => {
      const { error } = await apiClient.from("orders").update({ dp_status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Status DP diperbarui");
    },
    onError: () => toast.error("Gagal memperbarui DP"),
  });

  const toggleExpand = (id: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusStyle = (status: string) => {
    return statusOptions.find((s) => s.value === status)?.color || "bg-gray-100 text-gray-700";
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("0")
      ? "62" + cleanPhone.slice(1)
      : cleanPhone;
    window.open(`https://wa.me/${formattedPhone}?text=Halo ${name}, terima kasih telah memesan di Sarah Bakery!`, "_blank");
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  };

  const toggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Hapus ${selectedIds.length} pesanan yang dipilih?`)) return;
    try {
      for (const id of selectedIds) {
        await apiClient.from("orders").delete().eq("id", id);
      }
      toast.success(`${selectedIds.length} pesanan berhasil dihapus`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err: any) {
      toast.error("Gagal menghapus pesanan: " + err.message);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    if (!selectedIds.length) return;
    try {
      for (const id of selectedIds) {
        await apiClient.from("orders").update({ status }).eq("id", id);
      }
      toast.success(`Status ${selectedIds.length} pesanan diubah ke ${status}`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err: any) {
      toast.error("Gagal mengubah status: " + err.message);
    }
  };

  return (
    <AdminPageLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Pesanan
        </h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Action Bar */}
      {orders.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 mb-4 bg-card rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={orders.length > 0 && selectedIds.length === orders.length}
              onCheckedChange={toggleSelectAll}
              id="select-all-orders"
            />
            <label
              htmlFor="select-all-orders"
              className="text-sm font-medium cursor-pointer"
            >
              Pilih Semua ({orders.length})
            </label>
            {selectedIds.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
                {selectedIds.length} dipilih
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatusChange("processing")}
              >
                Set Diproses
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatusChange("completed")}
              >
                Set Selesai
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatusChange("cancelled")}
              >
                Set Dibatalkan
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Hapus ({selectedIds.length})
              </Button>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl shadow-soft">
          <p className="text-4xl mb-2">📋</p>
          <p className="text-muted-foreground">Belum ada pesanan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            const items = Array.isArray(order.items) ? order.items : [];

            return (
              <div
                key={order.id}
                className={`bg-card rounded-xl shadow-soft overflow-hidden ${
                  selectedIds.includes(order.id) ? "border-primary bg-primary/5 border" : ""
                }`}
              >
                {/* Order Header */}
                <div
                  className="p-4 cursor-pointer flex items-start gap-3"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="pt-1 flex-shrink-0"
                  >
                    <Checkbox
                      checked={selectedIds.includes(order.id)}
                      onCheckedChange={() => toggleSelectOne(order.id)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {order.customer_name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {order.order_type === "preorder" && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">PO</span>
                      )}
                      {order.order_type === "custom" && (
                        <span className="text-xs px-2 py-1 rounded-full bg-pink-100 text-pink-700">Custom</span>
                      )}
                      {order.dp_status === "paid" && (order.dp_amount ?? 0) > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">DP ✓</span>
                      )}
                      {order.dp_status === "unpaid" && (order.dp_amount ?? 0) > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">DP belum</span>
                      )}
                      <span className={cn("text-xs px-2 py-1 rounded-full", getStatusStyle(order.status))}>
                        {statusOptions.find((s) => s.value === order.status)?.label || order.status}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-muted-foreground">
                      {items.length} item
                    </p>
                    <p className="font-semibold text-primary">
                      {formatPrice(Number(order.total_amount))}
                    </p>
                  </div>
                </div>
              </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                    {/* Customer Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{order.customer_phone}</span>
                      </div>
                      {order.customer_address && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <span>{order.customer_address}</span>
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Detail Pesanan
                      </p>
                      <div className="space-y-1">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>
                              {item.name} x{item.quantity}
                            </span>
                            <span className="text-muted-foreground">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PO / Custom info */}
                    {(order.order_type === "preorder" || order.order_type === "custom") && (
                      <div className="bg-primary/10 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-primary uppercase">
                          {order.order_type === "preorder" ? "Pre-Order" : "Custom Order"}
                        </p>
                        {order.preorder_date && (
                          <p className="text-sm">
                            📅 Tanggal: <span className="font-medium">
                              {new Date(order.preorder_date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                            </span>
                          </p>
                        )}
                        {(order.dp_amount ?? 0) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span>DP 50%: <span className="font-bold">{formatPrice(Number(order.dp_amount))}</span></span>
                            <Select
                              value={order.dp_status || "unpaid"}
                              onValueChange={(v) => updateDpMutation.mutate({ id: order.id, dp_status: v })}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unpaid">Belum Bayar</SelectItem>
                                <SelectItem value="paid">Sudah Bayar</SelectItem>
                                <SelectItem value="refunded">Refund</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {order.custom_details && (
                          <div className="text-sm">
                            <p className="text-xs text-muted-foreground mb-1">Detail Custom:</p>
                            <p className="whitespace-pre-wrap">{order.custom_details}</p>
                          </div>
                        )}
                        {order.custom_image_url && (
                          <a href={order.custom_image_url} target="_blank" rel="noopener noreferrer">
                            <img src={order.custom_image_url} alt="Referensi" className="w-full max-w-xs rounded-lg border border-border" />
                          </a>
                        )}
                      </div>
                    )}

                    {order.notes && (
                      <div className="bg-secondary/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Catatan
                        </p>
                        <p className="text-sm">{order.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={order.status}
                        onValueChange={(value) =>
                          updateStatusMutation.mutate({ id: order.id, status: value })
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => openWhatsApp(order.customer_phone, order.customer_name)}
                        className="flex-shrink-0"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminPageLayout>
  );
}



