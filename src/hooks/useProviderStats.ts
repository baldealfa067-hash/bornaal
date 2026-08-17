import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProviderStats {
  profile_views: number;
  whatsapp_clicks: number;
  call_clicks: number;
}

export const useProviderStatsRealtime = (
  providerId: string | null,
  onStats: (stats: ProviderStats) => void
) => {
  useEffect(() => {
    if (!providerId) return;
    const channel = supabase
      .channel(`provider-stats-${providerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "provider_stats",
          filter: `provider_id=eq.${providerId}`,
        },
        async () => {
          const { data } = await supabase
            .from("provider_stats")
            .select("profile_views, whatsapp_clicks, call_clicks")
            .eq("provider_id", providerId)
            .maybeSingle();
          if (data) {
            onStats({
              profile_views: data.profile_views ?? 0,
              whatsapp_clicks: data.whatsapp_clicks ?? 0,
              call_clicks: data.call_clicks ?? 0,
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerId, onStats]);
};