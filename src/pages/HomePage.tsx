import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { ProductCard, ProductCardVariant } from "@/components/ProductCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { HeroSlider } from "@/components/HeroSlider";
import { Loader2, Sparkles, ChevronRight, LayoutGrid, Columns2, List, Newspaper, Calendar, ChefHat } from "lucide-react";
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

  // Article view mode state: "grid" (2 kolom) | "list" (baris list)
  const [articleViewMode, setArticleViewMode] = useState<"grid" | "list">(() => {
    return (localStorage.getItem("sarahbakery_home_article_view") as "grid" | "list") || "grid";
  });

  const handleArticleViewChange = (mode: "grid" | "list") => {
    setArticleViewMode(mode);
    localStorage.setItem("sarahbakery_home_article_view", mode);
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

  const { data: latestArticles = [] } = useQuery({
    queryKey: ["home_latest_articles"],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) return [];
      return data || [];
    },
  });

  return (
    <div className="min-h-screen bg-background pb-safe">
      <SEO jsonLd={homeJsonLd} />
      {/* Header */}
      <HeaderNav />

      {/* Hero Slider */}
      <HeroSlider />

      {/* Quick Discovery CTA Banners */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-3 grid gap-3 sm:grid-cols-2">
        <Link
          to="/custom-order"
          className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/5 border border-primary/20 rounded-3xl hover:border-primary/40 hover:shadow-soft transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shadow-xs">
              ✨
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Pesanan Custom &amp; PO Khusus</p>
              <p className="text-xs text-muted-foreground">Tema bebas • DP 50% • Jadwal fleksibel</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-primary flex-shrink-0 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/community"
          className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-primary/10 border border-amber-500/30 rounded-3xl hover:border-amber-500/50 hover:shadow-soft transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shadow-xs">
              👩‍🍳
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <span>Komunitas Resep Baking</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  Baru
                </span>
              </p>
              <p className="text-xs text-muted-foreground">Berbagi resep • Tips baking • Recook</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
        </Link>
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
      {latestArticles.length > 0 && (
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
              {/* 2 Kolom Grid vs List Switcher */}
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

          {/* Articles Container: 2 Kolom Grid atau List Row */}
          <div
            className={cn(
              articleViewMode === "grid" && "grid grid-cols-2 gap-3",
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
                  articleViewMode === "list" && "flex items-center gap-3 p-3"
                )}
              >
                {/* Image */}
                {article.cover_image && (
                  <div
                    className={cn(
                      "overflow-hidden bg-muted shrink-0",
                      articleViewMode === "grid" && "aspect-[16/10] w-full",
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
                )}

                {/* Content */}
                <div
                  className={cn(
                    "flex-1 flex flex-col justify-between",
                    articleViewMode === "grid" && "p-3 sm:p-4",
                    articleViewMode === "list" && "py-0.5"
                  )}
                >
                  <div>
                    <h3
                      className={cn(
                        "font-display font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2",
                        articleViewMode === "grid" ? "text-xs sm:text-sm" : "text-sm sm:text-base"
                      )}
                    >
                      {article.title}
                    </h3>
                    {article.excerpt && articleViewMode === "list" && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                  {article.published_at && (
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] sm:text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
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
        </section>
      )}
    </div>
  );
}
