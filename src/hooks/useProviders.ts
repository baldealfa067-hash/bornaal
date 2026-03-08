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
  avgRating: number;
  reviewCount: number;
}

export const useProviders = (category?: string) =>
  useQuery({
    queryKey: ["providers", category],
    queryFn: async (): Promise<ProviderWithRating[]> => {
      let q = supabase.from("profiles").select("*, reviews(rating)");
      if (category) q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((p: any) => {
        const ratings = p.reviews?.map((r: any) => r.rating) ?? [];
        return {
          ...p,
          reviews: undefined,
          avgRating: ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0,
          reviewCount: ratings.length,
        };
      });
    },
  });

export const useProvider = (id: string) =>
  useQuery({
    queryKey: ["provider", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, reviews(id, rating, comment, created_at, user_id)")
        .eq("id", id)
        .single();
      if (error) throw error;
      const ratings = data.reviews?.map((r: any) => r.rating) ?? [];
      return {
        ...data,
        avgRating: ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0,
        reviewCount: ratings.length,
      };
    },
    enabled: !!id,
  });

export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("category");
      if (error) throw error;
      const cats = [...new Set((data ?? []).map((p) => p.category))];
      return cats.sort();
    },
  });
