import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProviderWithRating {
  id: string;
  user_id: string;
  name: string;
  category: string;
  phone: string;
  location: string;
  description: string | null;
  photo_url: string | null;
  starting_price: number | null;
  services?: string[] | null;
  is_verified?: boolean | null;
  avgRating: number;
  reviewCount: number;
}

export const useProviders = (category?: string) =>
  useQuery({
    queryKey: ["providers", category],
    queryFn: async (): Promise<ProviderWithRating[]> => {
      let q = supabase.from("profiles").select("*");
      if (category) q = q.eq("category", category);
      const { data: profiles, error } = await q;
      if (error) throw error;

      // Fetch all reviews separately
      const profileIds = (profiles ?? []).map((p) => p.id);
      const reviews = profileIds.length
        ? (
            await supabase
              .from("reviews")
              .select("provider_id, rating")
              .eq("status", "aprovado")
              .in("provider_id", profileIds)
          ).data
        : [];

      return (profiles ?? []).map((p) => {
        const ratings = (reviews ?? [])
          .filter((r) => r.provider_id === p.id)
          .map((r) => r.rating);
        return {
          ...p,
          avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
          reviewCount: ratings.length,
        };
      });
    },
  });

export const useProvider = (id: string) =>
  useQuery({
    queryKey: ["provider", id],
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;

      const { data: reviews } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, user_id, reviewer_name")
        .eq("status", "aprovado")
        .eq("provider_id", id);

      const ratings = (reviews ?? []).map((r) => r.rating);
      return {
        ...profile,
        reviews: reviews ?? [],
        avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
        reviewCount: ratings.length,
      };
    },
    enabled: !!id,
  });

export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("name");
      if (error) throw error;
      return (data ?? []).map((c) => c.name).sort();
    },
  });
