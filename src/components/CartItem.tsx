import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore, CartItem as CartItemType } from "@/lib/store";

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="flex gap-3 p-3 bg-card rounded-xl shadow-soft animate-fade-in">
      <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            🥐
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1">
            {item.name}
          </h3>
          <p className="text-sm text-primary font-medium">
            {formatPrice(item.price)}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7 rounded-full"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="w-6 text-center font-medium text-sm">
              {item.quantity}
            </span>
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7 rounded-full"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => removeItem(item.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
