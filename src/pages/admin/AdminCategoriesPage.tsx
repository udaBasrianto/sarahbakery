import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ImageUpload";
import { Plus, Pencil, Trash2, GripVertical, Loader2, Tag, Search } from "lucide-react";
import { toast } from "sonner";
import { useAdminStoreId } from "@/hooks/useDefaultStore";

interface Category {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  store_id: string;
  created_at?: string;
  updated_at?: string;
}

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  icon: string;
  sort_order: string;
  is_active: boolean;
}

const defaultFormData: CategoryFormData = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  icon: "🍰",
  sort_order: "",
  is_active: true,
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const PRESET_ICONS = [
  "🍰", "🧁", "🥐", "🥖", "🍞", "🥨", "🥮", "🍪", "🥠",
  "🍩", "🎂", "🥧", "🧇", "🥞", "🍫", "🍬", "🍮", "🥤",
];

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const storeId = useAdminStoreId();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);
  const [search, setSearch] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("categories")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.description || "").toLowerCase().includes(q) ||
      (c.slug || "").toLowerCase().includes(q)
    );
  }, [categories, search]);

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const numericSort = parseInt(data.sort_order);
      const sortOrder = Number.isFinite(numericSort)
        ? numericSort
        : Math.max(...categories.map((c) => c.sort_order), 0) + 1;
      const slug = data.slug.trim() || slugify(data.name);
      const { error } = await apiClient.from("categories").insert({
        name: data.name.trim(),
        slug: slug || null,
        description: data.description.trim() || null,
        image_url: data.image_url.trim() || null,
        icon: data.icon.trim() || null,
        sort_order: sortOrder,
        is_active: data.is_active,
        store_id: storeId!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategori berhasil ditambahkan");
      handleCloseDialog();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Gagal menambahkan kategori (nama kategori sudah ada?)");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryFormData }) => {
      const numericSort = parseInt(data.sort_order);
      const sortOrder = Number.isFinite(numericSort) ? numericSort : 0;
      const slug = data.slug.trim() || slugify(data.name);
      const { error } = await apiClient
        .from("categories")
        .update({
          name: data.name.trim(),
          slug: slug || null,
          description: data.description.trim() || null,
          image_url: data.image_url.trim() || null,
          icon: data.icon.trim() || null,
          sort_order: sortOrder,
          is_active: data.is_active,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategori berhasil diperbarui");
      handleCloseDialog();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Gagal memperbarui kategori");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Kategori berhasil dihapus (produk di kategori ini otomatis menjadi tanpa kategori)");
    },
    onError: () => {
      toast.error("Gagal menghapus kategori");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await apiClient
        .from("categories")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: () => {
      toast.error("Gagal mengubah status kategori");
    },
  });

  const handleOpenDialog = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({
        name: cat.name,
        slug: cat.slug || "",
        description: cat.description || "",
        image_url: cat.image_url || "",
        icon: cat.icon || "🍰",
        sort_order: String(cat.sort_order),
        is_active: cat.is_active,
      });
    } else {
      setEditingCategory(null);
      setFormData({ ...defaultFormData });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormData({ ...defaultFormData });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Nama kategori harus diisi");
      return;
    }
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const countProductsByCategory = useMemo(() => {
    return {};
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kategori Produk</h1>
          <p className="text-muted-foreground">
            Atur kategori produk seperti Roti Manis, Kue Basah, Kue Kering, dll
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kategori..."
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Kategori
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="cat-name">Nama Kategori *</Label>
                    <Input
                      id="cat-name"
                      value={formData.name}
                      onChange={(e) => {
                        const nextName = e.target.value;
                        const autoSlug = editingCategory && formData.slug
                          ? formData.slug
                          : slugify(nextName);
                        setFormData({
                          ...formData,
                          name: nextName,
                          slug: editingCategory ? formData.slug : autoSlug,
                        });
                      }}
                      placeholder="Contoh: Kue Basah"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="cat-slug">Slug URL (auto-generate)</Label>
                    <Input
                      id="cat-slug"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: slugify(e.target.value) })
                      }
                      placeholder="kue-basah"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Slug akan digunakan di URL daftar produk (contoh: /products?cat=kue-basah)
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="cat-desc">Deskripsi</Label>
                    <Textarea
                      id="cat-desc"
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Deskripsi singkat kategori ini..."
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Icon Emoji</Label>
                    <div className="grid grid-cols-9 gap-1.5 mb-2">
                      {PRESET_ICONS.map((ic) => (
                        <button
                          type="button"
                          key={ic}
                          onClick={() => setFormData({ ...formData, icon: ic })}
                          className={`h-9 w-9 rounded-lg text-lg border transition ${
                            formData.icon === ic
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border hover:bg-muted/60"
                          }`}
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="Atau ketik emoji custom disini"
                      className="font-mono text-lg text-center"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="cat-sort">Urutan (sort_order)</Label>
                    <Input
                      id="cat-sort"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={formData.sort_order}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: e.target.value })
                      }
                      placeholder="1, 2, 3, ... (auto diisi urutan terakhir jika kosong)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Angka kecil muncul duluan di daftar kategori
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Gambar Kategori (opsional)</Label>
                    <ImageUpload
                      value={formData.image_url}
                      onChange={(url) => setFormData({ ...formData, image_url: url })}
                      folder="categories"
                    />
                    <p className="text-xs text-muted-foreground">
                      Bisa dikosongkan, jika kosong yang ditampilkan adalah icon emoji di atas
                    </p>
                  </div>
                  <div className="md:col-span-2 flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="cat-active" className="cursor-pointer">
                        Tampilkan di halaman produk
                      </Label>
                    </div>
                    <Switch
                      id="cat-active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    className="flex-1"
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingCategory ? "Simpan Perubahan" : "Tambah Kategori"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Grid Summary */}
      {!isLoading && filteredCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Ringkasan Kategori ({filteredCategories.length} dari {categories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {filteredCategories
                .filter((c) => c.is_active)
                .map((c) => (
                  <div
                    key={c.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-muted/40 text-foreground"
                  >
                    <span className="text-xl">{c.icon}</span>
                    <span className="font-medium">{c.name}</span>
                  </div>
                ))}
              {filteredCategories.filter((c) => c.is_active).length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada kategori aktif</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Tag className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            {search ? (
              <p className="text-muted-foreground">
                Tidak ada kategori yang cocok dengan pencarian "{search}"
              </p>
            ) : (
              <p className="text-muted-foreground">
                Belum ada kategori. Klik "Tambah Kategori" untuk membuat pertama kali.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCategories.map((cat) => (
            <Card
              key={cat.id}
              className={!cat.is_active ? "opacity-60" : ""}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab flex-shrink-0" />
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-14 h-14 rounded-xl object-cover border border-border flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-muted/60 border border-border flex-shrink-0">
                      {cat.icon || "🍰"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">
                        {cat.icon && <span className="mr-1">{cat.icon}</span>}
                        {cat.name}
                      </h3>
                      <span className="text-xs font-mono text-muted-foreground border rounded-full px-2 py-0.5">
                        /{cat.slug || String(cat.id)}
                      </span>
                      <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5 bg-muted/50">
                        sort {cat.sort_order}
                      </span>
                      {!cat.is_active && (
                        <span className="text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                          Non-aktif
                        </span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={cat.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({
                          id: cat.id,
                          is_active: checked,
                        })
                      }
                      aria-label="Toggle aktif kategori"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(cat)}
                      title="Edit kategori"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (
                          confirm(
                            `Hapus kategori "${cat.name}"?\nProduk di kategori ini TIDAK akan terhapus, hanya kategori yang dihapus.`
                          )
                        ) {
                          deleteMutation.mutate(cat.id);
                        }
                      }}
                      title="Hapus kategori"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
