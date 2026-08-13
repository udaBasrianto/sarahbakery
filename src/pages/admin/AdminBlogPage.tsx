import { useEffect, useState } from "react";
import { apiClient } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ImageUpload";
import { Plus, Pencil, Trash2, Eye, ExternalLink, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAdminStoreId } from "@/hooks/useDefaultStore";
import AdminPageLayout from "./AdminPageLayout";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string | null;
  tags: string[] | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image: "",
  meta_title: "",
  meta_description: "",
  keywords: "",
  tags: "",
  is_published: false,
};

export default function AdminBlogPage() {
  const storeId = useAdminStoreId();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  const loadPosts = async () => {
    setLoading(true);
    const { data, error } = await apiClient
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Gagal memuat artikel");
    else setPosts((data as BlogPost[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setAutoSlug(true);
    setOpen(true);
  };

  const openEdit = (p: BlogPost) => {
    setEditingId(p.id);
    setAutoSlug(false);
    setForm({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt || "",
      content: p.content,
      cover_image: p.cover_image || "",
      meta_title: p.meta_title || "",
      meta_description: p.meta_description || "",
      keywords: p.keywords || "",
      tags: (p.tags || []).join(", "),
      is_published: p.is_published,
    });
    setOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setForm((f) => ({
      ...f,
      title: val,
      slug: autoSlug ? slugify(val) : f.slug,
    }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Judul dan konten wajib diisi");
      return;
    }
    const slug = form.slug.trim() || slugify(form.title);
    setSaving(true);
    try {
      const { data: { user } } = await apiClient.auth.getUser();
      const tagsArr = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: form.title.trim(),
        slug,
        excerpt: form.excerpt.trim() || null,
        content: form.content,
        cover_image: form.cover_image || null,
        meta_title: form.meta_title.trim() || null,
        meta_description: form.meta_description.trim() || null,
        keywords: form.keywords.trim() || null,
        tags: tagsArr.length ? tagsArr : null,
        is_published: form.is_published,
        published_at:
          form.is_published && !editingId
            ? new Date().toISOString()
            : undefined,
        author_id: user?.id,
        store_id: storeId!,
      };

      if (editingId) {
        const { error } = await apiClient
          .from("blog_posts")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Artikel diperbarui");
      } else {
        const { error } = await apiClient.from("blog_posts").insert(payload);
        if (error) throw error;
        toast.success("Artikel dibuat");
      }
      setOpen(false);
      loadPosts();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus artikel ini?")) return;
    const { error } = await apiClient.from("blog_posts").delete().eq("id", id);
    if (error) toast.error("Gagal menghapus");
    else {
      toast.success("Artikel dihapus");
      loadPosts();
    }
  };

  const togglePublish = async (p: BlogPost) => {
    const next = !p.is_published;
    const { error } = await apiClient
      .from("blog_posts")
      .update({
        is_published: next,
        published_at: next && !p.published_at ? new Date().toISOString() : p.published_at,
      })
      .eq("id", p.id);
    if (error) toast.error("Gagal");
    else loadPosts();
  };

  const filtered = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()),
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Hapus ${selectedIds.length} artikel blog yang dipilih?`)) return;
    try {
      for (const id of selectedIds) {
        await apiClient.from("blog_posts").delete().eq("id", id);
      }
      toast.success(`${selectedIds.length} artikel berhasil dihapus`);
      setSelectedIds([]);
      loadPosts();
    } catch (err: any) {
      toast.error("Gagal menghapus artikel: " + err.message);
    }
  };

  const handleBulkTogglePublished = async (is_published: boolean) => {
    if (!selectedIds.length) return;
    try {
      for (const id of selectedIds) {
        await apiClient.from("blog_posts").update({ is_published }).eq("id", id);
      }
      toast.success(`Status ${selectedIds.length} artikel diperbarui`);
      setSelectedIds([]);
      loadPosts();
    } catch (err: any) {
      toast.error("Gagal memperbarui status: " + err.message);
    }
  };

  return (
    <AdminPageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Blog</h1>
          <p className="text-sm text-muted-foreground">
            Kelola artikel blog beserta SEO-nya
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Artikel Baru
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari judul atau slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Bulk Action Bar */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 mb-4 bg-card rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={filtered.length > 0 && selectedIds.length === filtered.length}
              onCheckedChange={toggleSelectAll}
              id="select-all-blog"
            />
            <label htmlFor="select-all-blog" className="text-sm font-medium cursor-pointer">
              Pilih Semua ({filtered.length})
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
                onClick={() => handleBulkTogglePublished(true)}
              >
                Set Publish
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkTogglePublished(false)}
              >
                Set Draft
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

      {loading ? (
        <p className="text-muted-foreground">Memuat...</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground">
          Belum ada artikel
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className={`bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start ${
                selectedIds.includes(p.id) ? "border-primary bg-primary/5" : ""
              }`}
            >
              <div className="pt-1">
                <Checkbox
                  checked={selectedIds.includes(p.id)}
                  onCheckedChange={() => toggleSelectOne(p.id)}
                />
              </div>
              {p.cover_image && (
                <img
                  src={p.cover_image}
                  alt={p.title}
                  className="w-full sm:w-32 h-32 sm:h-24 object-cover rounded-lg"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground truncate">
                    {p.title}
                  </h3>
                  <Badge variant={p.is_published ? "default" : "secondary"}>
                    {p.is_published ? "Publish" : "Draft"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  /blog/{p.slug}
                </p>
                {p.excerpt && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {p.excerpt}
                  </p>
                )}
              </div>
              <div className="flex sm:flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => togglePublish(p)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {p.is_published ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(p.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
                {p.is_published && (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/blog/${p.slug}`} target="_blank">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Artikel" : "Artikel Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Judul *</Label>
              <Input
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Contoh: Tips Memilih Kue Ulang Tahun"
              />
            </div>

            <div>
              <Label>Slug URL</Label>
              <Input
                value={form.slug}
                onChange={(e) => {
                  setAutoSlug(false);
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
                }}
                placeholder="tips-memilih-kue"
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL: /blog/{form.slug || "slug-otomatis"}
              </p>
            </div>

            <div>
              <Label>Gambar Sampul</Label>
              <ImageUpload
                value={form.cover_image}
                onChange={(url) => setForm((f) => ({ ...f, cover_image: url }))}
                folder="blog"
              />
            </div>

            <div>
              <Label>Ringkasan (Excerpt)</Label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                placeholder="Ringkasan singkat artikel..."
                rows={2}
                maxLength={300}
              />
            </div>

            <div>
              <Label>Konten *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Tulis konten artikel di sini. Mendukung baris baru..."
                rows={12}
              />
            </div>

            <div>
              <Label>Tags (pisahkan koma)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="kue, resep, ulang tahun"
              />
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <h4 className="font-semibold text-sm">SEO</h4>
              <div>
                <Label>Meta Title</Label>
                <Input
                  value={form.meta_title}
                  onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
                  placeholder="Default: judul artikel"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.meta_title.length}/60 karakter
                </p>
              </div>
              <div>
                <Label>Meta Description</Label>
                <Textarea
                  value={form.meta_description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, meta_description: e.target.value }))
                  }
                  placeholder="Default: ringkasan"
                  rows={2}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.meta_description.length}/160 karakter
                </p>
              </div>
              <div>
                <Label>Keywords</Label>
                <Input
                  value={form.keywords}
                  onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                  placeholder="kue ulang tahun, bakery, sarah bakery"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <Label>Publikasikan</Label>
                <p className="text-xs text-muted-foreground">
                  Artikel akan tampil di halaman blog
                </p>
              </div>
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
}



