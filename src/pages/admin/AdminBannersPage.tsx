import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminStoreId } from "@/hooks/useDefaultStore";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  background_color: string | null;
  text_color: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
}

interface BannerFormData {
  title: string;
  subtitle: string;
  image_url: string;
  background_color: string;
  text_color: string;
  icon: string;
  is_active: boolean;
}

const defaultFormData: BannerFormData = {
  title: "",
  subtitle: "",
  image_url: "",
  background_color: "#f97316",
  text_color: "#ffffff",
  icon: "🎂",
  is_active: true,
};

export default function AdminBannersPage() {
  const queryClient = useQueryClient();
  const storeId = useAdminStoreId();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState<BannerFormData>(defaultFormData);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("banners")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Banner[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BannerFormData) => {
      const maxOrder = Math.max(...banners.map((b) => b.sort_order), 0);
      const { error } = await apiClient.from("banners").insert({
        title: data.title,
        subtitle: data.subtitle || null,
        image_url: data.image_url || null,
        background_color: data.background_color,
        text_color: data.text_color,
        icon: data.icon || null,
        is_active: data.is_active,
        sort_order: maxOrder + 1,
        store_id: storeId!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner berhasil ditambahkan");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Gagal menambahkan banner");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BannerFormData }) => {
      const { error } = await apiClient
        .from("banners")
        .update({
          title: data.title,
          subtitle: data.subtitle || null,
          image_url: data.image_url || null,
          background_color: data.background_color,
          text_color: data.text_color,
          icon: data.icon || null,
          is_active: data.is_active,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner berhasil diperbarui");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Gagal memperbarui banner");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner berhasil dihapus");
    },
    onError: () => {
      toast.error("Gagal menghapus banner");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await apiClient
        .from("banners")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
    onError: () => {
      toast.error("Gagal mengubah status banner");
    },
  });

  const handleOpenDialog = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title,
        subtitle: banner.subtitle || "",
        image_url: banner.image_url || "",
        background_color: banner.background_color || "#f97316",
        text_color: banner.text_color || "#ffffff",
        icon: banner.icon || "🎂",
        is_active: banner.is_active,
      });
    } else {
      setEditingBanner(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBanner(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Judul banner harus diisi");
      return;
    }
    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kelola Banner</h1>
          <p className="text-muted-foreground">
            Atur slider promo di halaman utama
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? "Edit Banner" : "Tambah Banner Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Judul *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Diskon 20%"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle: e.target.value })
                  }
                  placeholder="Untuk semua kue ulang tahun!"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon/Emoji</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  placeholder="🎂"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="background_color">Warna Background</Label>
                  <div className="flex gap-2">
                    <Input
                      id="background_color"
                      type="color"
                      value={formData.background_color}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          background_color: e.target.value,
                        })
                      }
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.background_color}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          background_color: e.target.value,
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="text_color">Warna Teks</Label>
                  <div className="flex gap-2">
                    <Input
                      id="text_color"
                      type="color"
                      value={formData.text_color}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          text_color: e.target.value,
                        })
                      }
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.text_color}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          text_color: e.target.value,
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gambar Background (opsional)</Label>
                <ImageUpload
                  value={formData.image_url}
                  onChange={(url) =>
                    setFormData({ ...formData, image_url: url })
                  }
                  folder="banners"
                />
                <p className="text-xs text-muted-foreground">
                  Jika diisi, gambar akan digunakan sebagai background
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Aktif</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
              <div className="flex gap-2 pt-4">
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
                  {editingBanner ? "Simpan" : "Tambah"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Preview */}
      {banners.filter((b) => b.is_active).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Preview Slider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {banners
                .filter((b) => b.is_active)
                .map((banner) => (
                  <div
                    key={banner.id}
                    className="flex-shrink-0 w-64 rounded-xl overflow-hidden p-4 relative"
                    style={{
                      background: banner.image_url
                        ? `url(${banner.image_url}) center/cover`
                        : banner.background_color || "#f97316",
                      color: banner.text_color || "#ffffff",
                    }}
                  >
                    {banner.image_url && (
                      <div className="absolute inset-0 bg-black/30" />
                    )}
                    <div className="relative z-10">
                      <h3 className="font-bold text-lg">{banner.title}</h3>
                      {banner.subtitle && (
                        <p className="text-xs opacity-90">{banner.subtitle}</p>
                      )}
                    </div>
                    <div className="absolute right-2 bottom-0 text-4xl opacity-30">
                      {banner.icon}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : banners.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Belum ada banner</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <Card key={banner.id} className={!banner.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                    style={{
                      backgroundColor: banner.background_color || "#f97316",
                    }}
                  >
                    {banner.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{banner.title}</h3>
                    {banner.subtitle && (
                      <p className="text-sm text-muted-foreground truncate">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={banner.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({
                          id: banner.id,
                          is_active: checked,
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(banner)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Hapus banner ini?")) {
                          deleteMutation.mutate(banner.id);
                        }
                      }}
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



