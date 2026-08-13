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

import { HeaderNav } from "@/components/HeaderNav";

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
      <HeaderNav />

      {/* Hero Slider */}
      <HeroSlider />

      {/* Custom Order CTA */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-3">
        <Link
          to="/custom-order"
          className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/5 border border-primary/20 rounded-2xl hover:border-primary/40 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform">
              ✨
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Terima Pesanan Custom & PO Khusus</p>
              <p className="text-xs text-muted-foreground">Tema bebas • DP 50% • Pilih tanggal pengiriman</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-primary flex-shrink-0 group-hover:translate-x-1 transition-transform" />
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

      {/* Products */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
        <h2 className="font-display text-lg lg:text-xl font-bold text-foreground mb-4">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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



