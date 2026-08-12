import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProductReviewsProps {
  productId: string;
}

function StarRating({
  rating,
  onRate,
  interactive = false,
  size = "w-5 h-5",
}: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
  size?: string;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={cn("transition-colors", interactive && "cursor-pointer")}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => onRate?.(star)}
        >
          <Star
            className={cn(
              size,
              (hover || rating) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await apiClient.auth.getSession();
      return data.session;
    },
  });

  const { data: hasPurchased = false } = useQuery({
    queryKey: ["has-purchased", productId, session?.user?.id],
    queryFn: async () => {
      const { data, error } = await apiClient.rpc("has_purchased_product", {
        _user_id: session!.user.id,
        _product_id: productId,
      });
      if (error) return false;
      return data as boolean;
    },
    enabled: !!session?.user,
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch profiles for review authors
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await apiClient
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      
      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );
      
      return data.map((r) => ({
        ...r,
        profile: profileMap.get(r.user_id) || null,
      }));
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user) throw new Error("Login required");
      if (rating === 0) throw new Error("Rating required");
      const { error } = await apiClient.from("reviews").insert({
        product_id: productId,
        user_id: session.user.id,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      setRating(0);
      setComment("");
      setShowForm(false);
      toast.success("Review berhasil dikirim!");
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await apiClient
        .from("reviews")
        .delete()
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      toast.success("Review dihapus");
    },
  });

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const userReview = session?.user
    ? reviews.find((r) => r.user_id === session.user.id)
    : null;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-foreground">
            Ulasan ({reviews.length})
          </h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={Math.round(avgRating)} size="w-4 h-4" />
              <span className="text-sm text-muted-foreground">
                {avgRating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
        {session?.user && !userReview && !showForm && hasPurchased && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setShowForm(true)}
          >
            Tulis Ulasan
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-xl p-4 shadow-soft space-y-3">
          <p className="text-sm font-medium text-foreground">Rating</p>
          <StarRating rating={rating} onRate={setRating} interactive />
          <Textarea
            placeholder="Tulis ulasan Anda (opsional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            className="resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => submitMutation.mutate()}
              disabled={rating === 0 || submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Kirim
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => {
                setShowForm(false);
                setRating(0);
                setComment("");
              }}
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {!session?.user && (
        <p className="text-sm text-muted-foreground">
          Silakan login untuk memberikan ulasan.
        </p>
      )}

      {session?.user && !userReview && !hasPurchased && (
        <p className="text-sm text-muted-foreground">
          Hanya pembeli yang bisa memberikan ulasan.
        </p>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Belum ada ulasan untuk produk ini.
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const profile = review.profile as {
              name: string | null;
              avatar_url: string | null;
            } | null;
            return (
              <div
                key={review.id}
                className="bg-card rounded-xl p-4 shadow-soft space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs">
                        👤
                      </div>
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {profile?.name || "Anonim"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size="w-3.5 h-3.5" />
                    {session?.user?.id === review.user_id && (
                      <button
                        onClick={() => deleteMutation.mutate(review.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {review.comment}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/60">
                  {new Date(review.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



