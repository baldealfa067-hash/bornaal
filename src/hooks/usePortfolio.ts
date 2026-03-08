import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PortfolioImage {
  id: string;
  provider_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

export const usePortfolio = (providerId: string) =>
  useQuery({
    queryKey: ["portfolio", providerId],
    queryFn: async (): Promise<PortfolioImage[]> => {
      const { data, error } = await supabase
        .from("portfolio_images")
        .select("*")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PortfolioImage[];
    },
    enabled: !!providerId,
  });

export const useUploadPortfolioImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      providerId,
      userId,
      file,
      caption,
    }: {
      providerId: string;
      userId: string;
      file: File;
      caption?: string;
    }) => {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("portfolio")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("portfolio").getPublicUrl(path);

      const { error } = await supabase.from("portfolio_images").insert({
        provider_id: providerId,
        image_url: urlData.publicUrl,
        caption: caption || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, { providerId }) => {
      queryClient.invalidateQueries({ queryKey: ["portfolio", providerId] });
    },
  });
};

export const useDeletePortfolioImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, providerId }: { id: string; providerId: string }) => {
      const { error } = await supabase.from("portfolio_images").delete().eq("id", id);
      if (error) throw error;
      return providerId;
    },
    onSuccess: (providerId) => {
      queryClient.invalidateQueries({ queryKey: ["portfolio", providerId] });
    },
  });
};
