import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export const useMessages = (userId: string | null, otherUserId: string | null) =>
  useQuery({
    queryKey: ["messages", userId, otherUserId],
    queryFn: async (): Promise<Message[]> => {
      if (!userId || !otherUserId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
    enabled: !!userId && !!otherUserId,
    refetchInterval: 5000,
  });

export const useSendMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      senderId,
      receiverId,
      content,
    }: {
      senderId: string;
      receiverId: string;
      content: string;
    }) => {
      const { error } = await supabase.from("messages").insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["messages", variables.senderId, variables.receiverId],
      });
      qc.invalidateQueries({
        queryKey: ["messages", variables.receiverId, variables.senderId],
      });
      qc.invalidateQueries({ queryKey: ["unread-messages"] });
    },
  });
};

export const useUnreadMessagesCount = (userId: string | null) =>
  useQuery({
    queryKey: ["unread-messages", userId],
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("read", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
    refetchInterval: 10000,
  });

export const useMarkMessagesAsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      otherUserId,
    }: {
      userId: string;
      otherUserId: string;
    }) => {
      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .eq("receiver_id", userId)
        .eq("sender_id", otherUserId)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unread-messages"] });
    },
  });
};

export const useMessagesRealtime = (
  userId: string | null,
  otherUserId: string | null
) => {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId || !otherUserId) return;
    const channel = supabase
      .channel(`messages-${userId}-${otherUserId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === userId && msg.receiver_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.receiver_id === userId)
          ) {
            qc.invalidateQueries({
              queryKey: ["messages", userId, otherUserId],
            });
            qc.invalidateQueries({ queryKey: ["unread-messages"] });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, otherUserId, qc]);
};
