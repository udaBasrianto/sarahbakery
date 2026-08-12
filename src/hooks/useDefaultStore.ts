import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";

/** Returns the first approved store id. Used until full multi-tenant routing is wired. */
export function useDefaultStoreId() {
  const { data } = useQuery({
    queryKey: ["default-store-id"],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("stores")
        .select("id")
        .eq("status", "approved")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data ?? null;
}

/** Returns the admin's own store id (owner_id = current user). Falls back to first approved. */
export function useAdminStoreId() {
  const { data } = useQuery({
    queryKey: ["admin-store-id"],
    queryFn: async () => {
      const { data: sess } = await apiClient.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return null;
      const { data: own } = await apiClient
        .from("stores")
        .select("id")
        .eq("owner_id", uid)
        .eq("status", "approved")
        .maybeSingle();
      if (own?.id) return own.id;
      const { data: any } = await apiClient
        .from("stores")
        .select("id")
        .eq("status", "approved")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return any?.id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data ?? null;
}



