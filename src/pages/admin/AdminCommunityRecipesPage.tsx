import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import AdminPageLayout from "./AdminPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ChefHat, 
  Search, 
  Award, 
  Trash2, 
  ExternalLink, 
  Eye, 
  Heart, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { CommunityRecipe } from "../CommunityFeedPage";

export default function AdminCommunityRecipesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: recipes = [], isLoading, refetch } = useQuery({
    queryKey: ["admin_community_recipes"],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("community_recipes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching recipes:", error);
        return [];
      }
      return (data || []) as CommunityRecipe[];
    },
  });

  const handleToggleCurated = async (recipe: CommunityRecipe) => {
    try {
      const nextStatus = !recipe.is_curated_by_admin;
      const { error } = await apiClient
        .from("community_recipes")
        .update({ is_curated_by_admin: nextStatus })
        .eq("id", recipe.id);

      if (error) throw error;

      toast.success(
        nextStatus
          ? `Resep "${recipe.title}" ditandai sebagai Pilihan Sarah Bakery ⭐`
          : `Badge Pilihan Sarah Bakery dicabut dari "${recipe.title}"`
      );
      refetch();
    } catch (err: any) {
      toast.error("Gagal mengubah status kurasi resep");
    }
  };

  const handleTogglePublish = async (recipe: CommunityRecipe) => {
    try {
      const nextStatus = !recipe.is_published;
      const { error } = await apiClient
        .from("community_recipes")
        .update({ is_published: nextStatus })
        .eq("id", recipe.id);

      if (error) throw error;

      toast.success(nextStatus ? "Resep dipublikasikan" : "Resep disembunyikan (draft)");
      refetch();
    } catch (err: any) {
      toast.error("Gagal mengubah status publish");
    }
  };

  const handleDelete = async (recipe: CommunityRecipe) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus resep "${recipe.title}"?`)) return;

    try {
      const { error } = await apiClient
        .from("community_recipes")
        .delete()
        .eq("id", recipe.id);

      if (error) throw error;

      toast.success("Resep berhasil dihapus dari komunitas");
      refetch();
    } catch (err: any) {
      toast.error("Gagal menghapus resep");
    }
  };

  const filteredRecipes = recipes.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.user_name && r.user_name.toLowerCase().includes(q)) ||
      r.category.toLowerCase().includes(q)
    );
  });

  return (
    <AdminPageLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Moderasi Resep Komunitas
            </h1>
            <p className="text-muted-foreground text-sm">
              Kelola resep yang dibagikan pengguna, sematkan badge Pilihan Sarah Bakery, dan moderasi konten.
            </p>
          </div>
        </div>

        <Link to="/community/create">
          <Button className="rounded-2xl font-semibold gap-1.5 shadow-md">
            <ChefHat className="w-4 h-4" /> Tulis Resep Baru
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari judul resep, kategori, atau nama baker..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 rounded-2xl bg-card border-border/80"
        />
      </div>

      {/* Recipes List Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-3xl border border-border/80 p-8 space-y-2">
          <p className="text-4xl">🥐</p>
          <p className="font-bold text-foreground">Belum ada resep komunitas</p>
          <p className="text-xs text-muted-foreground">Resep yang dibuat oleh pengunjung atau admin akan muncul di sini.</p>
        </div>
      ) : (
        <div className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border/70 text-xs font-bold text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3.5">Resep &amp; Cover</th>
                  <th className="px-4 py-3.5">Penulis / Baker</th>
                  <th className="px-4 py-3.5">Kategori</th>
                  <th className="px-4 py-3.5 text-center">Statistik</th>
                  <th className="px-4 py-3.5 text-center">Pilihan Sarah</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRecipes.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    {/* Title & Cover */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/60">
                          {r.cover_image ? (
                            <img src={r.cover_image} alt={r.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">🧁</div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-foreground line-clamp-1">{r.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Author */}
                    <td className="px-4 py-3.5 text-xs font-medium text-foreground">
                      {r.user_name || "Anggota Baker"}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="text-[11px] font-semibold">
                        {r.category}
                      </Badge>
                    </td>

                    {/* Stats */}
                    <td className="px-4 py-3.5 text-center text-xs text-muted-foreground">
                      <div className="inline-flex items-center gap-2">
                        <span className="flex items-center gap-1 text-rose-500 font-semibold">
                          <Heart className="w-3.5 h-3.5 fill-current" /> {r.likes_count || 0}
                        </span>
                      </div>
                    </td>

                    {/* Curated toggle */}
                    <td className="px-4 py-3.5 text-center">
                      <Button
                        variant={r.is_curated_by_admin ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleCurated(r)}
                        className="rounded-xl text-xs font-semibold gap-1"
                      >
                        <Award className="w-3.5 h-3.5 text-amber-300" />
                        {r.is_curated_by_admin ? "Pilihan Sarah ⭐" : "Biasa"}
                      </Button>
                    </td>

                    {/* Status Publish */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleTogglePublish(r)}
                        className="inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        {r.is_published ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" /> Publik
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <XCircle className="w-4 h-4" /> Draft
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`/community/${r.slug}`} target="_blank">
                          <Button variant="ghost" size="icon" className="rounded-xl w-8 h-8 text-primary" title="Lihat Resep">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(r)}
                          className="rounded-xl w-8 h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          title="Hapus Resep"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
}
