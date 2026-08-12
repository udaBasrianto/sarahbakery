import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { useEffect, useState } from "react";

export function useWishlist() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    apiClient.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    const { data: { subscription } } = apiClient.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const { data: wishlistIds = [] } = useQuery({
    queryKey: ["wishlist", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await apiClient
        .from("wishlists")
        .select("product_id")
        .eq("user_id", userId);
      if (error) throw error;
      return data.map((w) => w.product_id);
    },
    enabled: !!userId,
  });

  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      if (!userId) throw new Error("Not authenticated");
      const isWished = wishlistIds.includes(productId);
      if (isWished) {
        const { error } = await apiClient
          .from("wishlists")
          .delete()
          .eq("user_id", userId)
          .eq("product_id", productId);
        if (error) throw error;
      } else {
        const { error } = await apiClient
          .from("wishlists")
          .insert({ user_id: userId, product_id: productId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", userId] });
    },
  });

  return { wishlistIds, toggleWishlist: toggle.mutate, isLoggedIn: !!userId };
}



