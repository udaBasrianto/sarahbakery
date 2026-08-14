import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { ProductCard } from "@/components/ProductCard";
import { useWishlist } from "@/hooks/useWishlist";
import { ArrowLeft, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WishlistPage() {
  const navigate = useNavigate();
  const { wishlistIds, toggleWishlist, isLoggedIn } = useWishlist();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    apiClient.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/auth");
      else setUserId(data.session.user.id);
    });
  }, [navigate]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["wishlist-products", wishlistIds],
    queryFn: async () => {
      if (wishlistIds.length === 0) return [];
      const { data, error } = await apiClient
        .from("products")
        .select("*")
        .in("id", wishlistIds);
      if (error) throw error;

      const { data: reviews } = await apiClient
        .from("reviews")
        .select("product_id, rating")
        .in("product_id", wishlistIds);

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
    enabled: wishlistIds.length > 0,
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-lg font-bold text-foreground">
            Wishlist Saya
          </h1>
        </div>
      </header>

      <section className="px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-1">Wishlist kosong</p>
            <p className="text-sm text-muted-foreground mb-6">
              Tambahkan produk favorit kamu dengan menekan icon hati
            </p>
            <Button onClick={() => navigate("/products")}>Jelajahi Produk</Button>
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



