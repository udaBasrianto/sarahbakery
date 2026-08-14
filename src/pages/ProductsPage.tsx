import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { ProductCard } from "@/components/ProductCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useWishlist } from "@/hooks/useWishlist";
import { SEO } from "@/components/SEO";

import { HeaderNav } from "@/components/HeaderNav";

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { wishlistIds, toggleWishlist, isLoggedIn } = useWishlist();

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
    queryKey: ["products", selectedCategory, searchQuery],
    queryFn: async () => {
      let query = apiClient
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("name");

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      }

      if (searchQuery.trim()) {
        query = query.ilike("name", `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

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
      <SEO
        title="Katalog Produk Roti & Kue Premium"
        description="Jelajahi berbagai pilihan bolu panggang lembut, roti manis, kue kering, dan pastry segar buatan dapur Sarah Bakery."
      />
      {/* Header */}
      <HeaderNav />

      {/* Search Header Bar */}
      <div className="bg-card border-b border-border py-4">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Katalog Produk Kami
            </h1>
            <p className="text-xs text-muted-foreground">
              Pilihan roti manis, kue basah, pastry & hampers hangat
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama kue atau roti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary border-0 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Categories Filter */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
        <CategoryFilter
          categories={categories}
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </section>

      {/* Products Grid */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-2 mb-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">🔍</p>
            <p className="text-muted-foreground">Produk tidak ditemukan</p>
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
    </div>
  );
}
