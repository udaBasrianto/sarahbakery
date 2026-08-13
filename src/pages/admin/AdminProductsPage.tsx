import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { Plus, Pencil, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAdminStoreId } from "@/hooks/useDefaultStore";
import AdminPageLayout from "./AdminPageLayout";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  is_available: boolean;
  brand: string | null;
  is_preorder?: boolean;
  preorder_days?: number | null;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  images: string[];
  category_id: string;
  is_available: boolean;
  brand: string;
  is_preorder: boolean;
  preorder_days: string;
}

const initialForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  images: [],
  category_id: "",
  is_available: true,
  brand: "",
  is_preorder: false,
  preorder_days: "",
};

type View = "list" | "form";

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const storeId = useAdminStoreId();
  const [view, setView] = useState<View>("list");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const { data: newProduct, error } = await apiClient.from("products").insert({
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price),
        image_url: data.images[0] || null,
        category_id: data.category_id || null,
        is_available: data.is_available,
        brand: data.brand || null,
        is_preorder: data.is_preorder,
        preorder_days: data.is_preorder && data.preorder_days ? parseInt(data.preorder_days) : null,
        store_id: storeId || 1,
      }).select().single();
      if (error) throw error;

      const createdProduct = Array.isArray(newProduct) ? newProduct[0] : newProduct;
      const createdId = createdProduct?.id;

      if (createdId && data.images.length > 0) {
        const imageRecords = data.images.map((url, index) => ({
          product_id: createdId,
          image_url: url,
          sort_order: index,
        }));
        const { error: imgError } = await apiClient.from("product_images").insert(imageRecords);
        if (imgError) throw imgError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Produk berhasil ditambahkan");
      closeForm();
    },
    onError: (err: any) => {
      toast.error("Gagal menambahkan produk: " + (err?.message || ""));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductForm }) => {
      const { error } = await apiClient
        .from("products")
        .update({
          name: data.name,
          description: data.description || null,
          price: parseFloat(data.price),
          image_url: data.images[0] || null,
          category_id: data.category_id || null,
          is_available: data.is_available,
          brand: data.brand || null,
          is_preorder: data.is_preorder,
          preorder_days: data.is_preorder && data.preorder_days ? parseInt(data.preorder_days) : null,
        })
        .eq("id", id);
      if (error) throw error;

      await apiClient.from("product_images").delete().eq("product_id", id);
      if (data.images.length > 0) {
        const imageRecords = data.images.map((url, index) => ({
          product_id: id,
          image_url: url,
          sort_order: index,
        }));
        const { error: imgError } = await apiClient.from("product_images").insert(imageRecords);
        if (imgError) throw imgError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Produk berhasil diperbarui");
      closeForm();
    },
    onError: () => {
      toast.error("Gagal memperbarui produk");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Produk berhasil dihapus");
    },
    onError: () => {
      toast.error("Gagal menghapus produk");
    },
  });

  const openCreate = () => {
    setEditingProduct(null);
    setForm(initialForm);
    setView("form");
  };

  const openEdit = async (product: Product) => {
    setEditingProduct(product);
    const { data: existingImages } = await apiClient
      .from("product_images")
      .select("image_url")
      .eq("product_id", product.id)
      .order("sort_order");

    const images = existingImages?.map((i) => i.image_url) ||
      (product.image_url ? [product.image_url] : []);

    setForm({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      images,
      category_id: product.category_id || "",
      is_available: product.is_available,
      brand: product.brand || "",
      is_preorder: !!product.is_preorder,
      preorder_days: product.preorder_days ? String(product.preorder_days) : "",
    });
    setView("form");
  };

  const closeForm = () => {
    setView("list");
    setEditingProduct(null);
    setForm(initialForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price.trim()) {
      toast.error("Mohon isi nama dan harga produk");
      return;
    }
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Yakin ingin menghapus produk ini?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  if (view === "form") {
    return (
      <AdminPageLayout className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={closeForm}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {editingProduct ? "Edit Produk" : "Tambah Produk"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-2xl shadow-soft p-4 lg:p-6">
          <div>
            <Label htmlFor="name">Nama Produk *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="price">Harga (Rp) *</Label>
            <Input
              id="price"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="category">Kategori</Label>
            <Select
              value={form.category_id}
              onValueChange={(value) => setForm({ ...form, category_id: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="brand">Merek</Label>
            <Input
              id="brand"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="mt-1"
              placeholder="Contoh: Holland Bakery"
            />
          </div>

          <div>
            <Label>Gambar Produk</Label>
            <MultiImageUpload
              images={form.images}
              onChange={(urls) => setForm({ ...form, images: urls })}
              folder="products"
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_available">Produk Tersedia</Label>
            <Switch
              id="is_available"
              checked={form.is_available}
              onCheckedChange={(checked) => setForm({ ...form, is_available: checked })}
            />
          </div>

          <div className="rounded-xl border border-border p-3 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_preorder" className="font-semibold">Pre-Order (PO)</Label>
                <p className="text-xs text-muted-foreground">Aktifkan jika produk dibuat setelah dipesan (bukan ready stock)</p>
              </div>
              <Switch
                id="is_preorder"
                checked={form.is_preorder}
                onCheckedChange={(checked) => setForm({ ...form, is_preorder: checked })}
              />
            </div>
            {form.is_preorder && (
              <div>
                <Label htmlFor="preorder_days">Lama Pengerjaan (hari) *</Label>
                <Input
                  id="preorder_days"
                  type="number"
                  min="1"
                  value={form.preorder_days}
                  onChange={(e) => setForm({ ...form, preorder_days: e.target.value })}
                  className="mt-1"
                  placeholder="Contoh: 2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Customer harus memesan minimal {form.preorder_days || "?"} hari sebelum tanggal pengambilan
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeForm} className="flex-1">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1"
            >
              {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </AdminPageLayout>
    );
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Hapus ${selectedIds.length} produk yang dipilih?`)) return;
    try {
      for (const id of selectedIds) {
        await apiClient.from("products").delete().eq("id", id);
      }
      toast.success(`${selectedIds.length} produk berhasil dihapus`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err: any) {
      toast.error("Gagal menghapus produk: " + err.message);
    }
  };

  const handleBulkAvailability = async (is_available: boolean) => {
    if (!selectedIds.length) return;
    try {
      for (const id of selectedIds) {
        await apiClient.from("products").update({ is_available }).eq("id", id);
      }
      toast.success(`Status ketersediaan ${selectedIds.length} produk diperbarui`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err: any) {
      toast.error("Gagal memperbarui ketersediaan: " + err.message);
    }
  };

  return (
    <AdminPageLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Produk</h1>
        <Button onClick={openCreate} className="rounded-full">
          <Plus className="w-4 h-4 mr-2" />
          Tambah
        </Button>
      </div>

      {/* Bulk Action Bar */}
      {products.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 mb-4 bg-card rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={products.length > 0 && selectedIds.length === products.length}
              onCheckedChange={toggleSelectAll}
              id="select-all-products"
            />
            <label htmlFor="select-all-products" className="text-sm font-medium cursor-pointer">
              Pilih Semua ({products.length})
            </label>
            {selectedIds.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
                {selectedIds.length} dipilih
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAvailability(true)}
              >
                Set Tersedia
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAvailability(false)}
              >
                Set Habis
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
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl shadow-soft">
          <p className="text-4xl mb-2">📦</p>
          <p className="text-muted-foreground">Belum ada produk</p>
          <Button onClick={openCreate} variant="link" className="mt-2">
            Tambah produk pertama
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {products.map((product) => (
            <div
              key={product.id}
              className={`flex items-center gap-3 p-3 bg-card rounded-xl shadow-soft ${
                selectedIds.includes(product.id) ? "border-primary bg-primary/5 border" : ""
              }`}
            >
              <Checkbox
                checked={selectedIds.includes(product.id)}
                onCheckedChange={() => toggleSelectOne(product.id)}
              />
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🥐</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-primary font-medium">{formatPrice(Number(product.price))}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      product.is_available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {product.is_available ? "Tersedia" : "Habis"}
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(product)}>
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(product.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}



