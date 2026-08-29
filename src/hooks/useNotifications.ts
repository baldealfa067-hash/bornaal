import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
  // Compat aliases for NotificationBell
  read: boolean;
  body: string;
  link: string | null;
}

const mapNotification = (n: Record<string, unknown>): Notification => ({
  id: n.id as string,
  title: n.title as string,
  message: n.message as string,
  type: n.type as string,
  reference_type: n.reference_type as string | null,
  reference_id: n.reference_id as string | null,
  is_read: n.is_read as boolean,
  created_at: n.created_at as string,
  read: n.is_read as boolean,
  body: n.message as string,
  link: n.reference_id ? `/${n.reference_type === "order" ? "pedido" : n.reference_type === "appointment" ? "meus-agendamentos" : "pedidos"}/${n.reference_id}` : null,
});

export const useNotifications = (userId: string | null) =>
  useQuery({
    queryKey: ["notifications", userId],
    queryFn: async (): Promise<Notification[]> => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc("get_my_notifications");
      if (error) throw error;
      return (data ?? []).map(mapNotification);
    },
    enabled: !!userId,
  });

export const useUnreadCount = (userId: string | null) =>
  useQuery({
    queryKey: ["notifications-unread", userId],
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;
      const { data, error } = await supabase.rpc("get_unread_notifications_count");
      if (error) throw error;
      return (data ?? 0) as number;
    },
    enabled: !!userId,
    refetchInterval: 30000,
  });

export const useMarkNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids?: string[]) => {
      const { error } = await supabase.rpc("mark_notifications_read", {
        p_ids: ids ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
};

// Alias for NotificationBell
export const useMarkAsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("mark_notifications_read", {
        p_ids: [id],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
};

// Alias for NotificationBell
export const useMarkAllAsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_userId?: string) => {
      const { error } = await supabase.rpc("mark_notifications_read", {
        p_ids: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
};

// Realtime subscription for notifications
export const useNotificationsRealtime = (userId: string | null) => {
  const qc = useQueryClient();
  if (!userId) return;

  supabase
    .channel("notifications-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      () => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["notifications-unread"] });
      }
    )
    .subscribe();
};

export const useCreateNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      userId: string;
      title: string;
      message: string;
      type?: string;
      referenceType?: string;
      referenceId?: string;
    }) => {
      const { data, error } = await supabase.rpc("create_notification", {
        p_user_id: params.userId,
        p_title: params.title,
        p_message: params.message,
        p_type: params.type ?? "info",
        p_reference_type: params.referenceType ?? null,
        p_reference_id: params.referenceId ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
};
