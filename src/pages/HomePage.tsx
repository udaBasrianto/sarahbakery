import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { ProductCard, ProductCardVariant } from "@/components/ProductCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { HeroSlider } from "@/components/HeroSlider";
import { Loader2, Sparkles, ChevronRight, LayoutGrid, Columns2, List, Newspaper, Calendar, ChefHat, Heart, Plus } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { SEO } from "@/components/SEO";
import { HeaderNav } from "@/components/HeaderNav";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { wishlistIds, toggleWishlist, isLoggedIn } = useWishlist();

  // View mode filter state: "grid" (2 kolom), "full" (1 kolom), "list" (list row)
  const [viewMode, setViewMode] = useState<ProductCardVariant>(() => {
    return (localStorage.getItem("sarahbakery_home_view_mode") as ProductCardVariant) || "grid";
  });

  const handleViewChange = (mode: ProductCardVariant) => {
    setViewMode(mode);
    localStorage.setItem("sarahbakery_home_view_mode", mode);
  };

  // Article view mode state: "grid" (2 kolom), "full" (1 kolom), "list" (baris list)
  const [articleViewMode, setArticleViewMode] = useState<ProductCardVariant>(() => {
    return (localStorage.getItem("sarahbakery_home_article_view") as ProductCardVariant) || "grid";
  });

  const handleArticleViewChange = (mode: ProductCardVariant) => {
    setArticleViewMode(mode);
    localStorage.setItem("sarahbakery_home_article_view", mode);
  };

  // Drag-to-scroll with mouse/cursor for under-slider discovery row
  const underSliderScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingUnderSlider, setIsDraggingUnderSlider] = useState(false);
  const [underSliderStartX, setUnderSliderStartX] = useState(0);
  const [underSliderScrollLeft, setUnderSliderScrollLeft] = useState(0);
  const [hasMovedUnderSlider, setHasMovedUnderSlider] = useState(false);

  const handleUnderSliderMouseDown = (e: React.MouseEvent) => {
    if (!underSliderScrollRef.current) return;
    setIsDraggingUnderSlider(true);
    setHasMovedUnderSlider(false);
    setUnderSliderStartX(e.pageX - underSliderScrollRef.current.offsetLeft);
    setUnderSliderScrollLeft(underSliderScrollRef.current.scrollLeft);
  };

  const handleUnderSliderMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingUnderSlider || !underSliderScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - underSliderScrollRef.current.offsetLeft;
    const walk = (x - underSliderStartX) * 1.3;
    if (Math.abs(walk) > 4) {
      setHasMovedUnderSlider(true);
    }
    underSliderScrollRef.current.scrollLeft = underSliderScrollLeft - walk;
  };

  const handleUnderSliderMouseUp = () => {
    setIsDraggingUnderSlider(false);
  };

  const homeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: "Sarah Bakery",
    image: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/640f06dd-3668-465b-a4f2-3711767cd895",
    "@id": "https://sarahbakery.com",
    url: "https://sarahbakery.com",
    priceRange: "$$",
    servesCuisine: "Bakery, Cakes, Pastry, Bolu Panggang",
    description: "Toko kue dan roti spesialis yang mengedepankan kualitas tekstur dan kemurnian rasa.",
  };

  // Fetch admin setting for homepage product limit
  const { data: homeLimitSetting = "10" } = useQuery({
    queryKey: ["setting_home_products_limit"],
    queryFn: async () => {
      const { data } = await apiClient
        .from("settings")
        .select("value")
        .eq("key", "home_products_limit")
        .maybeSingle();
      return data?.value || "10";
    },
  });

  // Fetch admin setting for homepage articles limit
  const { data: homeArticlesLimitSetting = "4" } = useQuery({
    queryKey: ["setting_home_articles_limit"],
    queryFn: async () => {
      const { data } = await apiClient
        .from("settings")
        .select("value")
        .eq("key", "home_articles_limit")
        .maybeSingle();
      return data?.value || "4";
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

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", selectedCategory, homeLimitSetting],
    queryFn: async () => {
      let query = apiClient
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: false });

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      } else if (homeLimitSetting && homeLimitSetting !== "all") {
        const limitNum = parseInt(homeLimitSetting, 10);
        if (!isNaN(limitNum) && limitNum > 0) {
          query = query.limit(limitNum);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch review stats for all products
      const productIds = data.map((p) => p.id);
      const { data: reviews } = await apiClient
        .from("reviews")
        .select("product_id, rating")
        .in("product_id", productIds);

      const statsMap = new Map<string, { sum: number; count: number }>();
      reviews?.forEach((r) => {
        const s = statsMap.get(r.product_id) || { sum: 0, count: 0 };
        s.sum += r.rating;
        s.count += 1;
        statsMap.set(r.product_id, s);
      });

      return data.map((p) => {
        const s = statsMap.get(p.id);
        return { ...p, avgRating: s ? s.sum / s.count : null, reviewCount: s?.count || 0 };
      });
    },
  });

  const { data: latestArticles = [], isLoading: isLoadingArticles } = useQuery({
    queryKey: ["home_latest_articles", homeArticlesLimitSetting],
    queryFn: async () => {
      try {
        let query = apiClient
          .from("blog_posts")
          .select("id, title, slug, excerpt, cover_image, published_at, is_published")
          .order("published_at", { ascending: false });

        if (homeArticlesLimitSetting && homeArticlesLimitSetting !== "all") {
          const limitNum = parseInt(homeArticlesLimitSetting, 10);
          if (!isNaN(limitNum) && limitNum > 0) {
            query = query.limit(limitNum);
          } else {
            query = query.limit(4);
          }
        } else {
          query = query.limit(10);
        }

        const { data, error } = await query;
        if (error) {
          console.error("Error fetching articles:", error);
          return [];
        }
        return (data || []).filter((a: any) => a.is_published !== false);
      } catch (err) {
        console.error("Error in home_latest_articles:", err);
        return [];
      }
    },
  });

  const { data: communityRecipes = [], isLoading: isLoadingCommunity } = useQuery({
    queryKey: ["home_community_recipes"],
    queryFn: async () => {
      try {
        const { data, error } = await apiClient
          .from("community_recipes")
          .select("id, title, slug, cover_image, category, prep_time_minutes, cook_time_minutes, likes_count, user_name, is_curated_by_admin")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error fetching community recipes:", error);
          return [];
        }
        return data || [];
      } catch (err) {
        console.error("Error in home_community_recipes:", err);
        return [];
      }
    },
  });

  return (
    <div className="min-h-screen bg-background pb-safe">
      <SEO jsonLd={homeJsonLd} />
      {/* Header */}
      <HeaderNav />

      {/* Hero Slider */}
      <HeroSlider />

      {/* Dedicated Section: Resep Komunitas di Bawah Slider (Horizontal Scrollable & Draggable) */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm shadow-xs">
              👩‍🍳
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-display text-sm sm:text-base font-bold text-foreground leading-tight">
                  Resep Komunitas
                </h2>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  Baru
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Inspirasi &amp; resep kreasi sesama baker
              </p>
            </div>
          </div>

          <Link
            to="/community"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 shrink-0"
          >
            Lihat Semua <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Draggable Horizontal Row of Community Recipes */}
        <div
          ref={underSliderScrollRef}
          onMouseDown={handleUnderSliderMouseDown}
          onMouseMove={handleUnderSliderMouseMove}
          onMouseUp={handleUnderSliderMouseUp}
          onMouseLeave={handleUnderSliderMouseUp}
          className={cn(
            "flex items-stretch gap-3 overflow-x-auto no-scrollbar scrollbar-hide pb-2 select-none cursor-grab active:cursor-grabbing",
            isDraggingUnderSlider && "cursor-grabbing"
          )}
        >
          {isLoadingCommunity ? (
            <div className="w-full flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            </div>
          ) : (
            <>
              {communityRecipes.map((recipe: any) => {
                const totalMins = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

                return (
                  <Link
                    key={recipe.id}
                    to={`/community/${recipe.slug}`}
                    onClick={(e) => {
                      if (hasMovedUnderSlider) e.preventDefault();
                    }}
                    className="w-44 sm:w-48 shrink-0 bg-card border border-border/80 rounded-2xl overflow-hidden shadow-soft hover:shadow-md hover:border-amber-500/50 transition-all group flex flex-col pointer-events-auto"
                  >
                    {/* Thumbnail Cover */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                      {recipe.cover_image ? (
                        <img
                          src={recipe.cover_image}
                          alt={recipe.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl bg-amber-50 dark:bg-amber-950/40">
                          🧁
                        </div>
                      )}

                      {recipe.is_curated_by_admin && (
                        <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                          Pilihan ⭐
                        </div>
                      )}

                      {totalMins > 0 && (
                        <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-md text-white text-[9px] px-1.5 py-0.2 rounded-full font-medium">
                          {totalMins} mnt
                        </div>
                      )}
                    </div>

                    {/* Body Info */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
                      <div>
                        <p className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          {recipe.category || "Resep"}
                        </p>
                        <h3 className="font-display font-bold text-xs text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {recipe.title}
                        </h3>
                      </div>

                      <div className="pt-1.5 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="truncate max-w-[85px]">
                          {recipe.user_name || "Baker"}
                        </span>
                        <span className="flex items-center gap-0.5 text-rose-500 font-semibold shrink-0">
                          <Heart className="w-2.5 h-2.5 fill-current" />
                          {recipe.likes_count || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* Share Recipe CTA Card at the end */}
              <Link
                to="/community/create"
                onClick={(e) => {
                  if (hasMovedUnderSlider) e.preventDefault();
                }}
                className="w-36 sm:w-40 shrink-0 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-dashed border-amber-500/40 rounded-2xl p-3 flex flex-col items-center justify-center text-center hover:border-amber-500 hover:bg-amber-500/15 transition-all group pointer-events-auto"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform mb-1.5">
                  <Plus className="w-4 h-4" />
                </div>
                <p className="font-bold text-xs text-foreground leading-tight">
                  Tulis Resep
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  Bagikan ke komunitas
                </p>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
        <CategoryFilter
          categories={categories}
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </section>

      {/* Products Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-2 mb-6">
        {/* Header Title + View Filter Switcher Toolbar */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <div>
            <h2 className="font-display text-lg lg:text-xl font-bold text-foreground">
              {selectedCategory
                ? categories.find((c) => c.id === selectedCategory)?.name || "Produk"
                : "Semua Produk"}
            </h2>
            {homeLimitSetting !== "all" && !selectedCategory && (
              <p className="text-[11px] text-muted-foreground">
                Menampilkan {products.length} produk terbaru
              </p>
            )}
          </div>

          {/* Interactive View Mode Filter pill using theme colors */}
          <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-full border border-border/70 shadow-inner">
            <button
              type="button"
              onClick={() => handleViewChange("grid")}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                viewMode === "grid"
                  ? "bg-card text-primary shadow-md scale-105 border border-border/40 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Tampilan 2 Kolom Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleViewChange("full")}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                viewMode === "full"
                  ? "bg-card text-primary shadow-md scale-105 border border-border/40 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Tampilan 1 Kolom Full"
            >
              <Columns2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleViewChange("list")}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                viewMode === "list"
                  ? "bg-card text-primary shadow-md scale-105 border border-border/40 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Tampilan List Row"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Product Cards Container based on viewMode */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">🥐</p>
            <p className="text-muted-foreground">Belum ada produk tersedia</p>
          </div>
        ) : (
          <div
            className={cn(
              viewMode === "grid" && "grid grid-cols-2 gap-3",
              viewMode === "full" && "grid grid-cols-1 gap-4",
              viewMode === "list" && "flex flex-col gap-3"
            )}
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                variant={viewMode}
                id={product.id}
                slug={(product as any).slug}
                isPreorder={(product as any).is_preorder}
                preorderDays={(product as any).preorder_days}
                minOrder={(product as any).min_order}
                name={product.name}
                price={Number(product.price)}
                image_url={product.image_url || undefined}
                description={product.description || undefined}
                avgRating={product.avgRating}
                reviewCount={product.reviewCount}
                viewCount={(product as any).view_count}
                soldCount={(product as any).sold_count}
                isWished={wishlistIds.includes(product.id)}
                onToggleWishlist={toggleWishlist}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
        )}
      </section>

      {/* Latest Articles Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 mb-16">
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg lg:text-xl font-bold text-foreground">
                Artikel &amp; Resep Terbaru
              </h2>
              <p className="text-xs text-muted-foreground">
                Tips memanggang &amp; resep kue lezat dapur Sarah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 3-way View Switcher: Grid (2 kolom), Full (1 kolom), List (baris) */}
            <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-full border border-border/70 shadow-inner">
              <button
                type="button"
                onClick={() => handleArticleViewChange("grid")}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300",
                  articleViewMode === "grid"
                    ? "bg-card text-primary shadow-md scale-105 border border-border/40 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Tampilan 2 Kolom Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleArticleViewChange("full")}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300",
                  articleViewMode === "full"
                    ? "bg-card text-primary shadow-md scale-105 border border-border/40 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Tampilan 1 Kolom Penuh"
              >
                <Columns2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleArticleViewChange("list")}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300",
                  articleViewMode === "list"
                    ? "bg-card text-primary shadow-md scale-105 border border-border/40 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Tampilan Baris List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            <Link
              to="/blog"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 shrink-0 pl-1"
            >
              Lihat Semua <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Content */}
        {isLoadingArticles ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : latestArticles.length === 0 ? (
          <div className="text-center py-10 bg-card rounded-3xl border border-border/80 p-6 space-y-2">
            <p className="text-3xl">📖</p>
            <p className="font-bold text-sm text-foreground">Artikel &amp; Resep Segera Hadir</p>
            <p className="text-xs text-muted-foreground">Kunjungi halaman blog untuk melihat artikel &amp; panduan resep.</p>
            <Link to="/blog">
              <span className="inline-flex items-center text-xs font-bold text-primary hover:underline mt-1">
                Buka Halaman Blog &amp; Artikel →
              </span>
            </Link>
          </div>
        ) : (
          <div
            className={cn(
              articleViewMode === "grid" && "grid grid-cols-2 gap-3",
              articleViewMode === "full" && "grid grid-cols-1 gap-4",
              articleViewMode === "list" && "flex flex-col gap-3"
            )}
          >
            {latestArticles.map((article: any) => (
              <Link
                key={article.id}
                to={`/blog/${article.slug}`}
                className={cn(
                  "group bg-card border border-border/80 rounded-2xl overflow-hidden shadow-soft hover:shadow-md hover:border-primary/40 transition-all",
                  articleViewMode === "grid" && "flex flex-col",
                  articleViewMode === "full" && "flex flex-col",
                  articleViewMode === "list" && "flex items-center gap-3 p-3"
                )}
              >
                {/* Image */}
                {article.cover_image ? (
                  <div
                    className={cn(
                      "overflow-hidden bg-muted shrink-0",
                      articleViewMode === "grid" && "aspect-[16/10] w-full",
                      articleViewMode === "full" && "aspect-[16/9] w-full",
                      articleViewMode === "list" && "w-20 h-20 sm:w-24 sm:h-24 rounded-xl"
                    )}
                  >
                    <img
                      src={article.cover_image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "overflow-hidden bg-muted flex items-center justify-center shrink-0 text-3xl",
                      articleViewMode === "grid" && "aspect-[16/10] w-full",
                      articleViewMode === "full" && "aspect-[16/9] w-full",
                      articleViewMode === "list" && "w-20 h-20 rounded-xl"
                    )}
                  >
                    🥐
                  </div>
                )}

                {/* Content */}
                <div
                  className={cn(
                    "flex-1 flex flex-col justify-between",
                    articleViewMode === "grid" && "p-3 sm:p-4",
                    articleViewMode === "full" && "p-4 space-y-2",
                    articleViewMode === "list" && "py-0.5"
                  )}
                >
                  <div>
                    <h3
                      className={cn(
                        "font-display font-bold text-foreground group-hover:text-primary transition-colors",
                        articleViewMode === "grid" && "text-xs sm:text-sm line-clamp-2",
                        articleViewMode === "full" && "text-base sm:text-lg",
                        articleViewMode === "list" && "text-sm sm:text-base line-clamp-2"
                      )}
                    >
                      {article.title}
                    </h3>
                    {article.excerpt && (articleViewMode === "full" || articleViewMode === "list") && (
                      <p className={cn("text-xs text-muted-foreground mt-1", articleViewMode === "list" ? "line-clamp-1" : "line-clamp-2")}>
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                  {article.published_at && (
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] sm:text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3 text-primary" />
                      <span>
                        {new Date(article.published_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
