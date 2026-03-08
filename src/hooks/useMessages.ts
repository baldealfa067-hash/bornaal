import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export const useConversations = (userId: string | undefined) =>
  useQuery({
    queryKey: ["conversations", userId],
    queryFn: async (): Promise<Conversation[]> => {
      if (!userId) return [];

      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Group by conversation partner
      const convMap = new Map<string, Message[]>();
      for (const msg of (messages as Message[]) ?? []) {
        const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        if (!convMap.has(partnerId)) convMap.set(partnerId, []);
        convMap.get(partnerId)!.push(msg);
      }

      // Fetch partner profiles
      const partnerIds = [...convMap.keys()];
      if (partnerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, photo_url")
        .in("user_id", partnerIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      return partnerIds.map((pid) => {
        const msgs = convMap.get(pid)!;
        const profile = profileMap.get(pid);
        return {
          partnerId: pid,
          partnerName: profile?.name ?? "Utilizador",
          partnerPhoto: profile?.photo_url ?? null,
          lastMessage: msgs[0].content,
          lastMessageAt: msgs[0].created_at,
          unreadCount: msgs.filter((m) => m.receiver_id === userId && !m.read).length,
        };
      }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    },
    enabled: !!userId,
  });

export const useChat = (userId: string | undefined, partnerId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chat", userId, partnerId],
    queryFn: async (): Promise<Message[]> => {
      if (!userId || !partnerId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Mark unread messages as read
      const unread = ((data as Message[]) ?? []).filter((m) => m.receiver_id === userId && !m.read);
      if (unread.length > 0) {
        await supabase
          .from("messages")
          .update({ read: true })
          .in("id", unread.map((m) => m.id));
      }

      return (data as Message[]) ?? [];
    },
    enabled: !!userId && !!partnerId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!userId || !partnerId) return;

    const channel = supabase
      .channel(`chat-${userId}-${partnerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === userId && msg.receiver_id === partnerId) ||
            (msg.sender_id === partnerId && msg.receiver_id === userId)
          ) {
            queryClient.invalidateQueries({ queryKey: ["chat", userId, partnerId] });
            queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, partnerId, queryClient]);

  return query;
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

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
    onSuccess: (_, { senderId, receiverId }) => {
      queryClient.invalidateQueries({ queryKey: ["chat", senderId, receiverId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", senderId] });
    },
  });
};

export const useUnreadCount = (userId: string | undefined) =>
  useQuery({
    queryKey: ["unread-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("read", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
    refetchInterval: 30000,
  });
