import { Plus, Check, Star, Heart, Eye, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  id: string;
  slug?: string | null;
  name: string;
  price: number;
  image_url?: string;
  description?: string;
  avgRating?: number | null;
  reviewCount?: number;
  viewCount?: number | null;
  soldCount?: number | null;
  isWished?: boolean;
  onToggleWishlist?: (id: string) => void;
  isLoggedIn?: boolean;
  isPreorder?: boolean;
  preorderDays?: number | null;
}

export function ProductCard({
  id,
  slug,
  name,
  price,
  image_url,
  description,
  avgRating,
  reviewCount = 0,
  viewCount = null,
  soldCount = null,
  isWished = false,
  onToggleWishlist,
  isLoggedIn = false,
  isPreorder = false,
  preorderDays,
}: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [isAdded, setIsAdded] = useState(false);
  const navigate = useNavigate();

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({ id, name, price, image_url });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatCompact = (n: number | null | undefined): string => {
    if (n == null || isNaN(n as any)) return "0";
    const v = Math.max(0, Number(n) | 0);
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (v >= 1_000) return (v / 1_000).toFixed(v >= 10_000 ? 0 : 1).replace(/\.0$/, "") + "k";
    return String(v);
  };

  return (
    <div
      onClick={() => navigate(`/product/${slug || id}`)}
      className="group bg-card rounded-2xl shadow-card overflow-hidden animate-fade-in hover:shadow-float transition-all duration-300 cursor-pointer"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {isLoggedIn && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist?.(id);
            }}
            className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110"
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-colors",
                isWished
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground"
              )}
            />
          </button>
        )}
        {image_url ? (
          <img
            src={image_url}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🥐
          </div>
        )}
        {isPreorder && (
          <span className="absolute top-2 left-2 z-10 text-[10px] font-semibold bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-soft">
            PO · {preorderDays || "?"}h
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-display font-semibold text-foreground line-clamp-1">
          {name}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {description}
          </p>
        )}
        {reviewCount > 0 && avgRating != null && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-foreground">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({reviewCount})</span>
          </div>
        )}
        {(viewCount != null || soldCount != null) && (
          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-muted-foreground">
            {viewCount != null && viewCount >= 0 && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 opacity-80" />
                <span className="tabular-nums">{formatCompact(viewCount)}</span>
              </span>
            )}
            {soldCount != null && soldCount >= 0 && (
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <Package className="w-3 h-3 opacity-90" />
                <span className="tabular-nums font-medium">{formatCompact(soldCount)}</span>
                <span className="opacity-80">terjual</span>
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="font-semibold text-primary text-sm">
            {formatPrice(price)}
          </span>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={isAdded}
            className={cn(
              "h-8 w-8 p-0 rounded-full transition-all duration-300",
              isAdded
                ? "bg-green-500 hover:bg-green-500"
                : "bg-accent hover:bg-accent/90"
            )}
          >
            {isAdded ? (
              <Check className="w-4 h-4 text-accent-foreground" />
            ) : (
              <Plus className="w-4 h-4 text-accent-foreground" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
