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

export interface ConversationPreview {
  otherUserId: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
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
    refetchInterval: 3000,
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
      const { error: msgError } = await supabase.from("messages").insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
      });
      if (msgError) throw msgError;

      // Create notification for the receiver
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", senderId)
        .maybeSingle();

      const senderName = senderProfile?.name || "Alguém";

      await supabase.from("notifications").insert({
        user_id: receiverId,
        type: "chat_message",
        title: "Nova mensagem",
        body: `${senderName}: ${content.length > 80 ? content.slice(0, 80) + "..." : content}`,
        link: null,
      });
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["messages", variables.senderId, variables.receiverId],
      });
      qc.invalidateQueries({
        queryKey: ["messages", variables.receiverId, variables.senderId],
      });
      qc.invalidateQueries({ queryKey: ["unread-messages"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
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
    refetchInterval: 5000,
  });

export const useUnreadFromUser = (
  userId: string | null,
  otherUserId: string | null
) =>
  useQuery({
    queryKey: ["unread-from", userId, otherUserId],
    queryFn: async (): Promise<number> => {
      if (!userId || !otherUserId) return 0;
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("sender_id", otherUserId)
        .eq("read", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId && !!otherUserId,
    refetchInterval: 5000,
  });

export const useConversations = (userId: string | null) =>
  useQuery({
    queryKey: ["conversations", userId],
    queryFn: async (): Promise<ConversationPreview[]> => {
      if (!userId) return [];

      // Get all messages involving this user
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!messages || messages.length === 0) return [];

      // Group by conversation partner
      const convMap = new Map<
        string,
        { lastMessage: string; lastMessageAt: string; unreadCount: number }
      >();

      for (const msg of messages as Message[]) {
        const otherId =
          msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        if (!convMap.has(otherId)) {
          const unreadFromThem =
            msg.receiver_id === userId && !msg.read ? 1 : 0;
          convMap.set(otherId, {
            lastMessage: msg.content,
            lastMessageAt: msg.created_at,
            unreadCount: unreadFromThem,
          });
        }
      }

      // Count actual unread per partner
      const previews: ConversationPreview[] = [];
      for (const [otherUserId, preview] of convMap) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", userId)
          .eq("sender_id", otherUserId)
          .eq("read", false);

        previews.push({
          otherUserId,
          lastMessage: preview.lastMessage,
          lastMessageAt: preview.lastMessageAt,
          unreadCount: count ?? 0,
        });
      }

      // Sort by most recent
      previews.sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
      );

      return previews;
    },
    enabled: !!userId,
    refetchInterval: 5000,
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
      qc.invalidateQueries({ queryKey: ["unread-from"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
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
            qc.invalidateQueries({ queryKey: ["unread-from"] });
            qc.invalidateQueries({ queryKey: ["conversations"] });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
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
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, otherUserId, qc]);
};
