import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { ProductCard } from "@/components/ProductCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { HeroSlider } from "@/components/HeroSlider";
import { Loader2, Sparkles, ChevronRight } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { SEO } from "@/components/SEO";

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { wishlistIds, toggleWishlist, isLoggedIn } = useWishlist();

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
    queryKey: ["products", selectedCategory],
    queryFn: async () => {
      let query = apiClient
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: false });

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
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

  return (
    <div className="min-h-screen bg-background pb-safe">
      <SEO jsonLd={homeJsonLd} />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-2xl">
              🧁
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                Sarah Bakery
              </h1>
              <p className="text-xs text-muted-foreground">
                Roti & Kue Segar Setiap Hari
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Slider */}
      <HeroSlider />

      {/* Custom Order CTA */}
      <section className="px-4 pt-3">
        <Link
          to="/custom-order"
          className="flex items-center gap-3 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 rounded-2xl p-4 shadow-soft hover:shadow-md transition"
        >
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-foreground">Pesan Kue Custom (PO)</p>
            <p className="text-xs text-muted-foreground">Tema bebas • DP 50% • Pilih tanggal pengambilan</p>
          </div>
          <ChevronRight className="w-5 h-5 text-primary flex-shrink-0" />
        </Link>
      </section>

      {/* Categories */}
      <section className="px-4 py-2">
        <CategoryFilter
          categories={categories}
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </section>

      {/* Products */}
      <section className="px-4 py-4">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">
          {selectedCategory
            ? categories.find((c) => c.id === selectedCategory)?.name || "Produk"
            : "Semua Produk"}
        </h2>

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
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                slug={(product as any).slug}
                isPreorder={(product as any).is_preorder}
                preorderDays={(product as any).preorder_days}
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
    </div>
  );
}



