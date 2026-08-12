import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  background_color: string | null;
  text_color: string | null;
  icon: string | null;
  sort_order: number;
}

export function HeroSlider() {
  const plugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: false }));

  const { data: banners = [] } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Banner[];
    },
  });

  if (banners.length === 0) {
    return null;
  }

  return (
    <section className="px-4 py-4">
      <Carousel
        opts={{ loop: true }}
        plugins={[plugin.current]}
        className="w-full"
      >
        <CarouselContent>
          {banners.map((banner) => (
            <CarouselItem key={banner.id}>
              <div
                className="relative rounded-2xl overflow-hidden p-6 min-h-[260px] flex flex-col justify-center"
                style={{
                  background: banner.image_url
                    ? `url(${banner.image_url}) center/cover`
                    : banner.background_color || "#f97316",
                  color: banner.text_color || "#ffffff",
                }}
              >
                {banner.image_url && (
                  <div className="absolute inset-0 bg-black/30" />
                )}
                <div className="relative z-10">
                  <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-medium mb-2">
                    🎉 Promo Spesial
                  </span>
                  <h2 className="font-display text-2xl font-bold mb-1">
                    {banner.title}
                  </h2>
                  {banner.subtitle && (
                    <p className="text-sm opacity-90">{banner.subtitle}</p>
                  )}
                </div>
                <div className="absolute right-4 bottom-0 text-6xl opacity-30">
                  {banner.icon || "🎂"}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {banners.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {banners.map((_, index) => (
              <div
                key={index}
                className="w-2 h-2 rounded-full bg-muted-foreground/30"
              />
            ))}
          </div>
        )}
      </Carousel>
    </section>
  );
}



