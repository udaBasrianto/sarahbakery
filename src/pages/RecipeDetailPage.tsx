import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { SEO } from "@/components/SEO";
import { HeaderNav } from "@/components/HeaderNav";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Heart, 
  Bookmark, 
  Share2, 
  Clock, 
  Users, 
  ChefHat, 
  Lightbulb, 
  CheckSquare, 
  Square, 
  MessageSquare, 
  Send, 
  Award, 
  ShoppingBag,
  Sparkles,
  Loader2,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CommunityRecipe } from "./CommunityFeedPage";

interface CommentItem {
  id: number;
  recipe_id: number;
  user_id: number;
  user_name: string | null;
  user_avatar: string | null;
  content: string;
  created_at: string;
}

export default function RecipeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Checked ingredients state (checklist for home cooking)
  const [checkedIngredients, setCheckedIngredients] = useState<number[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // Comment input
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Load current user
  useEffect(() => {
    apiClient.auth.getUser().then(({ data }) => {
      const u = (data as any)?.user || data;
      if (u) setCurrentUser(u);
    });
  }, []);

  // Fetch recipe
  const { data: recipe, isLoading, refetch } = useQuery({
    queryKey: ["community_recipe_detail", slug],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("community_recipes")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();

      if (error) throw error;
      return data as CommunityRecipe | null;
    },
    enabled: !!slug,
  });

  // Sync likes and bookmarks
  useEffect(() => {
    if (recipe) {
      setLikesCount(recipe.likes_count || 0);

      if (currentUser) {
        apiClient
          .from("recipe_likes")
          .select("id")
          .eq("recipe_id", recipe.id)
          .eq("user_id", currentUser.id)
          .maybeSingle()
          .then(({ data }) => setIsLiked(!!data));

        apiClient
          .from("recipe_bookmarks")
          .select("id")
          .eq("recipe_id", recipe.id)
          .eq("user_id", currentUser.id)
          .maybeSingle()
          .then(({ data }) => setIsBookmarked(!!data));
      }
    }
  }, [recipe, currentUser]);

  // Fetch comments
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["recipe_comments", recipe?.id],
    queryFn: async () => {
      if (!recipe?.id) return [];
      const { data, error } = await apiClient
        .from("recipe_comments")
        .select("*")
        .eq("recipe_id", recipe.id)
        .order("created_at", { ascending: true });
      if (error) return [];
      return (data || []) as CommentItem[];
    },
    enabled: !!recipe?.id,
  });

  // Toggle Like
  const handleToggleLike = async () => {
    if (!currentUser) {
      toast.info("Silakan login terlebih dahulu untuk menyukai resep", {
        action: { label: "Login", onClick: () => navigate("/auth") },
      });
      return;
    }
    if (!recipe) return;

    if (isLiked) {
      setIsLiked(false);
      setLikesCount((prev) => Math.max(0, prev - 1));
      await apiClient
        .from("recipe_likes")
        .delete()
        .eq("recipe_id", recipe.id)
        .eq("user_id", currentUser.id);

      await apiClient
        .from("community_recipes")
        .update({ likes_count: Math.max(0, (recipe.likes_count || 1) - 1) })
        .eq("id", recipe.id);
    } else {
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
      await apiClient
        .from("recipe_likes")
        .insert({ recipe_id: recipe.id, user_id: currentUser.id });

      await apiClient
        .from("community_recipes")
        .update({ likes_count: (recipe.likes_count || 0) + 1 })
        .eq("id", recipe.id);

      toast.success("Resep ditambahkan ke disukai ❤️");
    }
  };

  // Toggle Bookmark
  const handleToggleBookmark = async () => {
    if (!currentUser) {
      toast.info("Silakan login untuk menyimpan resep", {
        action: { label: "Login", onClick: () => navigate("/auth") },
      });
      return;
    }
    if (!recipe) return;

    if (isBookmarked) {
      setIsBookmarked(false);
      await apiClient
        .from("recipe_bookmarks")
        .delete()
        .eq("recipe_id", recipe.id)
        .eq("user_id", currentUser.id);
      toast.info("Resep dihapus dari Buku Resep Saya");
    } else {
      setIsBookmarked(true);
      await apiClient
        .from("recipe_bookmarks")
        .insert({ recipe_id: recipe.id, user_id: currentUser.id });
      toast.success("Resep disimpan ke Buku Resep Saya 📖");
    }
  };

  // Submit Comment
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.info("Silakan login untuk menulis komentar", {
        action: { label: "Login", onClick: () => navigate("/auth") },
      });
      return;
    }
    if (!commentText.trim() || !recipe) return;

    setIsSubmittingComment(true);
    try {
      const authorName =
        currentUser.full_name || currentUser.name || currentUser.email?.split("@")[0] || "Anggota Baker";
      const authorAvatar = currentUser.avatar_url || null;

      const { error } = await apiClient.from("recipe_comments").insert({
        recipe_id: recipe.id,
        user_id: currentUser.id,
        user_name: authorName,
        user_avatar: authorAvatar,
        content: commentText.trim(),
      });

      if (error) throw error;

      toast.success("Komentar berhasil dikirim!");
      setCommentText("");
      refetchComments();
    } catch (err: any) {
      toast.error("Gagal mengirim komentar");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Toggle Ingredient Check
  const toggleIngredientCheck = (index: number) => {
    setCheckedIngredients((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // Share link
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: recipe?.title,
        text: `Lihat resep nikmat "${recipe?.title}" di Komunitas Sarah Bakery!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard?.writeText(window.location.href);
      toast.success("Tautan resep disalin ke clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Memuat detail resep...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center space-y-4">
        <div className="text-5xl">🧁</div>
        <h2 className="font-display font-bold text-xl text-foreground">Resep tidak ditemukan</h2>
        <p className="text-sm text-muted-foreground">Resep mungkin telah dihapus atau tautan salah.</p>
        <Button onClick={() => navigate("/community")} className="rounded-2xl font-bold">
          Kembali ke Komunitas
        </Button>
      </div>
    );
  }

  // Parse ingredients and steps
  let parsedIngredients: any[] = [];
  let parsedSteps: any[] = [];
  try {
    parsedIngredients = typeof recipe.ingredients === "string" ? JSON.parse(recipe.ingredients) : recipe.ingredients || [];
  } catch {}
  try {
    parsedSteps = typeof recipe.steps === "string" ? JSON.parse(recipe.steps) : recipe.steps || [];
  } catch {}

  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <div className="min-h-screen bg-background pb-32">
      <SEO
        title={`${recipe.title} - Resep Komunitas Sarah Bakery`}
        description={recipe.description || `Panduan cara membuat ${recipe.title} lengkap dengan takaran bahan dan langkah mudah.`}
        image={recipe.cover_image || undefined}
      />

      <HeaderNav />

      <main className="px-4 py-4 max-w-3xl mx-auto space-y-6">
        {/* Top Bar Actions */}
        <div className="flex items-center justify-between">
          <Link
            to="/community"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-card border border-border/80 text-xs font-semibold hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali ke Komunitas</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleBookmark}
              className={cn("rounded-2xl w-9 h-9", isBookmarked && "bg-primary/10 border-primary text-primary")}
              title="Simpan ke Buku Resep"
            >
              <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              className="rounded-2xl w-9 h-9"
              title="Bagikan Resep"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Hero Cover Image */}
        <div className="relative aspect-[16/10] w-full rounded-3xl overflow-hidden shadow-soft border border-border/80 bg-muted">
          {recipe.cover_image ? (
            <img src={recipe.cover_image} alt={recipe.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950 dark:to-orange-950 text-6xl">
              🧁
            </div>
          )}

          {recipe.is_curated_by_admin && (
            <div className="absolute top-4 left-4 bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              <span>Resep Pilihan Sarah Bakery ⭐</span>
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full font-semibold">
              {recipe.category}
            </div>
          </div>
        </div>

        {/* Recipe Title & Meta Header */}
        <div className="space-y-3">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            {recipe.title}
          </h1>

          {recipe.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {recipe.description}
            </p>
          )}

          {/* Author info & stats */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
            <div className="flex items-center gap-2.5">
              {recipe.user_avatar ? (
                <img
                  src={recipe.user_avatar}
                  alt={recipe.user_name || "Baker"}
                  className="w-9 h-9 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {(recipe.user_name || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-foreground">{recipe.user_name || "Anggota Baker"}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date(recipe.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleToggleLike}
              variant={isLiked ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-2xl gap-1.5 font-bold transition-all",
                isLiked ? "bg-rose-500 hover:bg-rose-600 text-white" : "hover:text-rose-500 hover:border-rose-500"
              )}
            >
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              <span>{likesCount} Suka</span>
            </Button>
          </div>
        </div>

        {/* Quick Specs Cards */}
        <div className="grid grid-cols-3 gap-2.5 bg-card border border-border/80 rounded-3xl p-3.5 shadow-soft text-center">
          <div className="p-2 space-y-1">
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" /> Total Waktu
            </p>
            <p className="font-bold text-sm text-foreground">{totalTime} mnt</p>
          </div>
          <div className="p-2 space-y-1 border-x border-border/60">
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5 text-primary" /> Porsi / Hasil
            </p>
            <p className="font-bold text-sm text-foreground">{recipe.servings || "6-8 potong"}</p>
          </div>
          <div className="p-2 space-y-1">
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <ChefHat className="w-3.5 h-3.5 text-primary" /> Kesulitan
            </p>
            <p className="font-bold text-sm text-foreground">{recipe.difficulty || "Mudah"}</p>
          </div>
        </div>

        {/* Section: Bahan-Bahan (Interactive Checklist) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Bahan-Bahan ({parsedIngredients.length})
            </h2>
            <span className="text-xs text-muted-foreground">Centang bahan yang sudah siap</span>
          </div>

          <Card className="rounded-3xl shadow-soft border-border/80 overflow-hidden">
            <CardContent className="p-4 divide-y divide-border/60 space-y-1">
              {parsedIngredients.map((ing: any, idx: number) => {
                const isChecked = checkedIngredients.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleIngredientCheck(idx)}
                    className={cn(
                      "w-full text-left flex items-center justify-between py-3 px-2 rounded-xl transition-colors hover:bg-muted/40",
                      isChecked && "text-muted-foreground line-through bg-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={cn("text-sm font-medium", isChecked && "text-muted-foreground")}>
                        {ing.name}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-primary shrink-0 ml-2">
                      {ing.amount} {ing.unit}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Section: Langkah-Langkah Pembuatan */}
        <div className="space-y-3">
          <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-primary" />
            Langkah-Langkah Pembuatan
          </h2>

          <div className="space-y-3">
            {parsedSteps.map((st: any, idx: number) => (
              <div
                key={idx}
                className="bg-card border border-border/80 rounded-3xl p-4 shadow-soft flex items-start gap-3.5"
              >
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-primary to-orange-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  {st.step_number || idx + 1}
                </div>
                <p className="text-sm text-foreground leading-relaxed pt-1">
                  {st.instruction}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Tips Rahasia Baking */}
        {recipe.tips && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 space-y-2 text-amber-950 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
              <Lightbulb className="w-4 h-4" />
              <span>Tips &amp; Rahasia Sukses Baking</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed">{recipe.tips}</p>
          </div>
        )}

        {/* E-Commerce Upsell Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/15 via-amber-500/10 to-primary/10 border border-primary/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-display font-bold text-base text-foreground">
              Ingin langsung menikmati tanpa repot memanggang?
            </p>
            <p className="text-xs text-muted-foreground">
              Pesan aneka kue &amp; bolu panggang fresh dari Sarah Bakery, dikirim langsung ke rumah Anda.
            </p>
          </div>
          <Button
            onClick={() => navigate("/products")}
            className="rounded-2xl font-bold gap-1.5 shrink-0 shadow-md"
          >
            <ShoppingBag className="w-4 h-4" />
            Lihat Menu Sarah Bakery
          </Button>
        </div>

        {/* Section: Komentar & Diskusi Komunitas */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Diskusi &amp; Pertanyaan ({comments.length})
            </h2>
          </div>

          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="bg-card border border-border/80 rounded-3xl p-4 shadow-soft space-y-3">
            <Textarea
              placeholder={
                currentUser
                  ? "Tanyakan tips atau bagikan hasil recook resep ini..."
                  : "Silakan login untuk bergabung dalam diskusi resep..."
              }
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={2}
              className="rounded-2xl"
              disabled={!currentUser}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {currentUser ? `Komentar sebagai ${currentUser.full_name || currentUser.name || "Baker"}` : "Belum login"}
              </p>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingComment || !commentText.trim() || !currentUser}
                className="rounded-xl font-bold gap-1"
              >
                {isSubmittingComment ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Kirim Komentar
              </Button>
            </div>
          </form>

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Belum ada komentar. Jadilah yang pertama memberikan review atau bertanya!
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comm) => (
                <div key={comm.id} className="bg-card border border-border/70 rounded-2xl p-3.5 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {comm.user_avatar ? (
                        <img src={comm.user_avatar} alt={comm.user_name || "User"} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                          {(comm.user_name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-bold text-foreground">{comm.user_name || "Anggota Baker"}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(comm.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed pl-8">
                    {comm.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
