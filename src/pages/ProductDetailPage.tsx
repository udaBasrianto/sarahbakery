import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { useCartStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Minus, Check, Loader2, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductReviews from "@/components/ProductReviews";
import { SEO } from "@/components/SEO";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const isUuid = !!slug && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const query = apiClient.from("products").select("*, categories(name, icon)");
      const { data, error } = await (isUuid
        ? query.eq("id", slug!).maybeSingle()
        : query.eq("slug", slug!).maybeSingle());
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const productId = product?.id;

  const { data: productImages = [] } = useQuery({
    queryKey: ["product-images", productId],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("product_images")
        .select("*")
        .eq("product_id", productId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const minOrder = Math.max(1, Number((product as any)?.min_order) || 1);

  // Sync initial quantity with min_order when product loads
  useEffect(() => {
    if (product) {
      const pMin = Math.max(1, Number((product as any)?.min_order) || 1);
      setQuantity((prev) => Math.max(prev, pMin));
    }
  }, [product]);

  // Build image list: product_images first, fallback to main image_url
  const allImages = productImages.length > 0
    ? productImages.map((img) => img.image_url)
    : product?.image_url
      ? [product.image_url]
      : [];

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(
      {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image_url: allImages[0] || undefined,
        min_order: minOrder,
      },
      quantity
    );
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-4xl">😢</p>
        <p className="text-muted-foreground">Produk tidak ditemukan</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Kembali
        </Button>
      </div>
    );
  }

  const category = product.categories as { name: string; icon: string | null } | null;

  const productJsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    image: allImages.length > 0 ? allImages : [product.image_url],
    description: product.description || `Beli ${product.name} lezat dari Sarah Bakery.`,
    sku: product.sku || `SB-${product.id}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "IDR",
      price: product.price,
      availability: product.is_available !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "Sarah Bakery",
      },
    },
  };

  return (
    <div className="min-h-screen bg-background pb-safe">
      <SEO
        title={product.name}
        description={product.description || `Pesan ${product.name} segar buatan tangan dari Sarah Bakery.`}
        ogType="product"
        ogImage={allImages[0] || product.image_url}
        jsonLd={productJsonLd}
      />
      {/* Header */}
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
          <h1 className="font-display text-lg font-bold text-foreground line-clamp-1">
            Detail Produk
          </h1>
        </div>
      </header>

      {/* Image Gallery */}
      <div className="relative">
        <div className="aspect-square bg-secondary overflow-hidden">
          {allImages.length > 0 ? (
            <img
              src={allImages[activeImage]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              🥐
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {allImages.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto">
            {allImages.map((url, index) => (
              <button
                key={index}
                onClick={() => setActiveImage(index)}
                className={cn(
                  "w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all",
                  activeImage === index
                    ? "border-primary shadow-soft"
                    : "border-border opacity-60 hover:opacity-100"
                )}
              >
                <img
                  src={url}
                  alt={`${product.name} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="px-4 py-4 space-y-4">
        {/* Category Badge */}
        {category && (
          <span className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">
            {category.icon} {category.name}
          </span>
        )}

        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            {product.name}
          </h2>
          {product.brand && (
            <p className="text-sm text-muted-foreground mt-0.5">{product.brand}</p>
          )}
          <p className="text-xl font-semibold text-primary mt-1">
            {formatPrice(Number(product.price))}
          </p>
        </div>

        {/* Description */}
        {product.description && (
          <div className="bg-card rounded-xl p-4 shadow-soft">
            <h3 className="font-display font-semibold text-foreground mb-2">
              Deskripsi
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        )}

        {/* Availability + Preorder */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full",
              product.is_available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", product.is_available ? "bg-green-500" : "bg-red-500")} />
            {product.is_available ? "Tersedia" : "Stok Habis"}
          </span>
          {minOrder > 1 && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-semibold">
              📦 Minimal Pemesanan: {minOrder} pcs
            </span>
          )}
          {(product as any).is_preorder && (
            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-medium">
              ⏱️ Pre-Order · {(product as any).preorder_days || "?"} hari pengerjaan
            </span>
          )}
        </div>
        {minOrder > 1 && (
          <div className="bg-primary/5 border border-primary/15 text-foreground text-xs rounded-xl p-3 flex items-center gap-2">
            <span>💡</span>
            <span>Produk ini memiliki batas minimal pemesanan <strong>{minOrder} pcs</strong> per pesanan.</span>
          </div>
        )}
        {(product as any).is_preorder && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3">
            Produk ini dibuat setelah pesanan masuk. Mohon pesan minimal{" "}
            <strong>{(product as any).preorder_days || "?"} hari</strong> sebelum tanggal pengambilan, dengan DP 50%.
          </div>
        )}

        {/* Reviews */}
        <ProductReviews productId={product.id} />
      </div>

      {/* Sticky Bottom Bar */}
      {product.is_available && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Quantity */}
            <div className="flex items-center gap-2 bg-secondary rounded-full px-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setQuantity(Math.max(minOrder, quantity - 1))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-semibold text-foreground">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Add to Cart */}
            <Button
              className={cn(
                "flex-1 rounded-full h-11 text-base transition-all",
                isAdded && "bg-green-500 hover:bg-green-500"
              )}
              onClick={handleAddToCart}
              disabled={isAdded}
            >
              {isAdded ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Ditambahkan!
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Tambah {formatPrice(Number(product.price) * quantity)}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}



