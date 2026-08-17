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

// Atualiza os contadores (vistas/WhatsApp/ligações) em tempo real
// + polling de 15s como seguro caso o Realtime não entregue eventos
export const useProviderStatsRealtime = (
  providerId: string | null,
  onStats: (stats: ProviderStats) => void
) => {
  const fetchStats = async () => {
    if (!providerId) return;
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
  };

  // Realtime subscription
  useEffect(() => {
    if (!providerId) return;
    const channel = supabase
      .channel(`provider-stats-${providerId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "provider_stats",
          filter: `provider_id=eq.${providerId}`,
        },
        () => { fetchStats(); }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerId]);

  // Polling fallback: refetch a cada 15s
  useEffect(() => {
    if (!providerId) return;
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [providerId]);
};

// Consulta o histórico recente de atividade do prestador
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

// Atualiza o histórico em tempo real (novas vistas/contactos)
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