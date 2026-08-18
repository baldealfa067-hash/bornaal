import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProviderStats {
  profile_views: number;
  whatsapp_clicks: number;
  call_clicks: number;
}

export interface ProviderActivity {
  id: string;
  provider_id: string;
  activity_type: "vista" | "whatsapp" | "call";
  created_at: string;
}

export const useProviderStatsRealtime = (
  providerId: string | null,
  onStats: (stats: ProviderStats) => void
) => {
  useEffect(() => {
    if (!providerId) return;
    let cancelled = false;
    const fetchStats = async () => {
      const { data, error } = await supabase
        .from("provider_stats")
        .select("profile_views, whatsapp_clicks, call_clicks")
        .eq("provider_id", providerId)
        .maybeSingle();
      if (!cancelled && data) {
        onStats({
          profile_views: data.profile_views ?? 0,
          whatsapp_clicks: data.whatsapp_clicks ?? 0,
          call_clicks: data.call_clicks ?? 0,
        });
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [providerId, onStats]);
};

export const useProviderStatsQuery = (providerId: string | null) =>
  useQuery({
    queryKey: ["provider-stats", providerId],
    queryFn: async (): Promise<ProviderStats> => {
      if (!providerId) return { profile_views: 0, whatsapp_clicks: 0, call_clicks: 0 };
      const { data } = await supabase
        .from("provider_stats")
        .select("profile_views, whatsapp_clicks, call_clicks")
        .eq("provider_id", providerId)
        .maybeSingle();
      return {
        profile_views: data?.profile_views ?? 0,
        whatsapp_clicks: data?.whatsapp_clicks ?? 0,
        call_clicks: data?.call_clicks ?? 0,
      };
    },
    enabled: !!providerId,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

export const useProviderActivity = (providerId: string | null) =>
  useQuery({
    queryKey: ["provider-activity", providerId],
    queryFn: async (): Promise<ProviderActivity[]> => {
      if (!providerId) return [];
      const { data, error } = await supabase
        .from("provider_activity")
        .select("id, provider_id, activity_type, created_at")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ProviderActivity[];
    },
    enabled: !!providerId,
  });

export const useProviderActivityRealtime = (providerId: string | null) => {
  const qc = useQueryClient();
  useEffect(() => {
    if (!providerId) return;
    const channel = supabase
      .channel(`provider-activity-${providerId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "provider_activity",
          filter: `provider_id=eq.${providerId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["provider-activity", providerId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerId, qc]);
};
