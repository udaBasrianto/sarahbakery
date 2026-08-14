import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { SEO } from "@/components/SEO";
import { HeaderNav } from "@/components/HeaderNav";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ChefHat, 
  Search, 
  Plus, 
  Heart, 
  MessageSquare, 
  Clock, 
  Bookmark, 
  Sparkles, 
  Flame, 
  Award, 
  SlidersHorizontal,
  ChevronRight,
  Loader2,
  LayoutGrid,
  List
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CommunityRecipe {
  id: number;
  user_id: number;
  user_name: string | null;
  user_avatar: string | null;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  category: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: string;
  difficulty: string;
  ingredients: string;
  steps: string;
  tips: string | null;
  likes_count: number;
  views_count: number;
  is_curated_by_admin: boolean;
  is_published: boolean;
  created_at: string;
}

const CATEGORIES = [
  "Semua",
  "Bolu & Cake",
  "Roti & Donat",
  "Cookies & Brownies",
  "Pastry & Pie",
  "Dessert & Puding",
  "Jajanan Pasar"
];

export default function CommunityFeedPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [activeTab, setActiveTab] = useState<"latest" | "trending" | "curated">("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [likedIds, setLikedIds] = useState<number[]>([]);

  // View mode state: "grid" (2 kolom) | "list" (baris list)
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    return (localStorage.getItem("sarahbakery_community_view_mode") as "grid" | "list") || "grid";
  });

  const handleViewChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("sarahbakery_community_view_mode", mode);
  };

  // Check auth
  useEffect(() => {
    apiClient.auth.getUser().then(({ data }) => {
      const u = (data as any)?.user || data;
      if (u) {
        setCurrentUser(u);
        loadUserInteractions(u.id);
      }
    });
  }, []);

  const loadUserInteractions = async (userId: number) => {
    try {
      const [{ data: likes }, { data: bms }] = await Promise.all([
        apiClient.from("recipe_likes").select("recipe_id").eq("user_id", userId),
        apiClient.from("recipe_bookmarks").select("recipe_id").eq("user_id", userId),
      ]);
      if (likes) setLikedIds(likes.map((l: any) => l.recipe_id));
      if (bms) setBookmarkedIds(bms.map((b: any) => b.recipe_id));
    } catch {}
  };

  // Fetch community recipes
  const { data: recipes = [], isLoading, refetch } = useQuery({
    queryKey: ["community_recipes", selectedCategory, activeTab],
    queryFn: async () => {
      let query = apiClient
        .from("community_recipes")
        .select("*")
        .eq("is_published", true);

      if (selectedCategory !== "Semua") {
        query = query.eq("category", selectedCategory);
      }

      if (activeTab === "trending") {
        query = query.order("likes_count", { ascending: false });
      } else if (activeTab === "curated") {
        query = query.eq("is_curated_by_admin", true).order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching recipes:", error);
        return [];
      }
      return (data || []) as CommunityRecipe[];
    },
  });

  // Filter with local search query
  const filteredRecipes = recipes.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.user_name && r.user_name.toLowerCase().includes(q))
    );
  });

  const handleToggleLike = async (e: React.MouseEvent, recipeId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      toast.info("Silakan login untuk menyukai resep", {
        action: { label: "Login", onClick: () => navigate("/auth") },
      });
      return;
    }

    const isLiked = likedIds.includes(recipeId);
    if (isLiked) {
      setLikedIds((prev) => prev.filter((id) => id !== recipeId));
      await apiClient.from("recipe_likes").delete().eq("recipe_id", recipeId).eq("user_id", currentUser.id);
    } else {
      setLikedIds((prev) => [...prev, recipeId]);
      await apiClient.from("recipe_likes").insert({ recipe_id: recipeId, user_id: currentUser.id });
      toast.success("Resep ditambahkan ke disukai ❤️");
    }
    refetch();
  };

  const handleToggleBookmark = async (e: React.MouseEvent, recipeId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      toast.info("Silakan login untuk menyimpan resep", {
        action: { label: "Login", onClick: () => navigate("/auth") },
      });
      return;
    }

    const isBookmarked = bookmarkedIds.includes(recipeId);
    if (isBookmarked) {
      setBookmarkedIds((prev) => prev.filter((id) => id !== recipeId));
      await apiClient.from("recipe_bookmarks").delete().eq("recipe_id", recipeId).eq("user_id", currentUser.id);
      toast.info("Resep dihapus dari koleksi buku resep");
    } else {
      setBookmarkedIds((prev) => [...prev, recipeId]);
      await apiClient.from("recipe_bookmarks").insert({ recipe_id: recipeId, user_id: currentUser.id });
      toast.success("Resep disimpan ke Buku Resep Saya 📖");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <SEO
        title="Komunitas Resep Kue & Baking - Sarah Bakery"
        description="Jelajahi ratusan resep kue, bolu kukus, roti lembut, dan cookies dari komunitas pecinta baking Sarah Bakery. Tulis resep kreasi Anda dan diskusikan tips baking."
      />

      <HeaderNav />

      {/* Hero Banner Komunitas */}
      <section className="px-4 pt-4 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-primary to-orange-700 text-white p-6 sm:p-8 shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
              <ChefHat className="w-4 h-4" />
              <span>Komunitas Pecinta Baking Sarah Bakery</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Berbagi Resep &amp; Rahasia Sukses Memanggang 🥐✨
            </h1>
            <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
              Temukan inspirasi resep bolu lembut, roti berserat halus, dan kue kering renyah dari sesama baker. Bagikan resep rahasia Anda!
            </p>
            <div className="pt-2 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (!currentUser) {
                    toast.info("Silakan login untuk membagikan resep Anda", {
                      action: { label: "Login", onClick: () => navigate("/auth") },
                    });
                    return;
                  }
                  navigate("/community/create");
                }}
                className="bg-white text-primary hover:bg-white/90 font-bold rounded-2xl shadow-md gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Tulis &amp; Bagikan Resep
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveTab("curated")}
                className="bg-white/10 hover:bg-white/20 border-white/30 text-white font-semibold rounded-2xl"
              >
                <Award className="w-4 h-4 mr-1 text-amber-300" />
                Pilihan Sarah Bakery
              </Button>
            </div>
          </div>
          {/* Background Decorative Emojis */}
          <div className="absolute right-4 bottom-2 text-7xl sm:text-9xl opacity-20 select-none pointer-events-none">
            🧁
          </div>
        </div>
      </section>

      {/* Search & Tabs Filter */}
      <section className="px-4 pt-5 max-w-7xl mx-auto space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari resep bolu pandan, brownies, roti sobek, atau nama baker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-2xl bg-card border-border/80 h-11"
          />
        </div>

        {/* Tab Sorting */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scrollbar-hide">
          <button
            onClick={() => setActiveTab("latest")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0",
              activeTab === "latest"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Terbaru</span>
          </button>
          <button
            onClick={() => setActiveTab("trending")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0",
              activeTab === "trending"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Terpopuler (Trending)</span>
          </button>
          <button
            onClick={() => setActiveTab("curated")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0",
              activeTab === "curated"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Pilihan Sarah Bakery ⭐</span>
          </button>
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border",
                  isActive
                    ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                    : "bg-card border-border/70 text-muted-foreground hover:border-primary/50"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Recipe Cards Feed Header & Switcher */}
      <section className="px-4 pt-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Resep Komunitas ({filteredRecipes.length})
            </h2>
          </div>

          {/* 2 Kolom Grid vs List Switcher */}
          <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-full border border-border/70 shadow-inner">
            <button
              type="button"
              onClick={() => handleViewChange("grid")}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300",
                viewMode === "grid"
                  ? "bg-card text-primary shadow-md scale-105 border border-border/40 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Tampilan 2 Kolom Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleViewChange("list")}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300",
                viewMode === "list"
                  ? "bg-card text-primary shadow-md scale-105 border border-border/40 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Tampilan Baris List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Memuat kreasi resep komunitas...</p>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl border border-border/80 p-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl mx-auto">
              👩‍🍳
            </div>
            <h3 className="font-display font-bold text-lg text-foreground">
              Belum ada resep di kategori ini
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Jadilah orang pertama yang membagikan resep kue kreasi Anda untuk dinikmati seluruh komunitas!
            </p>
            <Button
              onClick={() => {
                if (!currentUser) {
                  navigate("/auth");
                  return;
                }
                navigate("/community/create");
              }}
              className="rounded-2xl font-bold mt-2"
            >
              <Plus className="w-4 h-4 mr-1" /> Tulis Resep Pertama
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              viewMode === "grid" && "grid grid-cols-2 gap-3",
              viewMode === "list" && "flex flex-col gap-3"
            )}
          >
            {filteredRecipes.map((recipe) => {
              const isLiked = likedIds.includes(recipe.id);
              const isBookmarked = bookmarkedIds.includes(recipe.id);
              const totalMinutes = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

              return (
                <Link
                  key={recipe.id}
                  to={`/community/${recipe.slug}`}
                  className={cn(
                    "group bg-card border border-border/80 rounded-2xl overflow-hidden shadow-soft hover:shadow-xl transition-all duration-300 hover:border-primary/40",
                    viewMode === "grid" && "flex flex-col",
                    viewMode === "list" && "flex items-center gap-3 p-3"
                  )}
                >
                  {/* Cover Image */}
                  <div
                    className={cn(
                      "relative overflow-hidden bg-muted shrink-0",
                      viewMode === "grid" && "aspect-[16/10] w-full",
                      viewMode === "list" && "w-24 h-24 sm:w-28 sm:h-28 rounded-2xl"
                    )}
                  >
                    {recipe.cover_image ? (
                      <img
                        src={recipe.cover_image}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950 dark:to-orange-950 text-3xl">
                        🧁
                      </div>
                    )}

                    {/* Curated by Admin Badge */}
                    {recipe.is_curated_by_admin && viewMode === "grid" && (
                      <div className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        <span>Pilihan</span>
                      </div>
                    )}

                    {/* Duration Pill in Grid Mode */}
                    {viewMode === "grid" && (
                      <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1.5">
                        <Clock className="w-2.5 h-2.5 text-amber-300" />
                        <span>{totalMinutes} mnt</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div
                    className={cn(
                      "flex-1 flex flex-col justify-between",
                      viewMode === "grid" && "p-3 space-y-2",
                      viewMode === "list" && "py-0.5 space-y-1.5"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground mb-1">
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0">
                          {recipe.category}
                        </Badge>
                        {recipe.is_curated_by_admin && viewMode === "list" && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                            <Award className="w-3 h-3" /> Pilihan
                          </span>
                        )}
                      </div>

                      <h3
                        className={cn(
                          "font-display font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors",
                          viewMode === "grid" ? "text-xs sm:text-sm" : "text-sm sm:text-base"
                        )}
                      >
                        {recipe.title}
                      </h3>

                      {recipe.description && viewMode === "list" && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 leading-relaxed">
                          {recipe.description}
                        </p>
                      )}
                    </div>

                    {/* Author & Engagement Row */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate max-w-[100px] sm:max-w-[130px]">
                        {recipe.user_avatar ? (
                          <img
                            src={recipe.user_avatar}
                            alt={recipe.user_name || "Baker"}
                            className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
                            {(recipe.user_name || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-[10px] sm:text-xs font-medium text-foreground truncate">
                          {recipe.user_name || "Baker"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleToggleLike(e, recipe.id)}
                          className={cn(
                            "flex items-center gap-0.5 transition-colors hover:text-rose-500",
                            isLiked && "text-rose-500 font-bold"
                          )}
                        >
                          <Heart className={cn("w-3 h-3", isLiked && "fill-current text-rose-500")} />
                          <span>{recipe.likes_count || 0}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleToggleBookmark(e, recipe.id)}
                          className={cn(
                            "hover:text-primary transition-colors",
                            isBookmarked && "text-primary font-bold"
                          )}
                          title="Simpan"
                        >
                          <Bookmark className={cn("w-3 h-3", isBookmarked && "fill-current")} />
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
}
