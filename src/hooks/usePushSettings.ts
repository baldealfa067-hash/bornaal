import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  disablePush,
  enablePush,
  getExistingSubscription,
  getPermission,
  isPushSupported,
  saveSubscription,
  type PushPermission,
} from "@/lib/push";

export interface PushSettings {
  permission: PushPermission;
  supported: boolean;
  subscribed: boolean;
  pushEnabled: boolean;
  novidades: boolean;
  updating: boolean;
  togglePush: () => Promise<void>;
  setNovidades: (value: boolean) => Promise<void>;
}

export const usePushSettings = (userId: string | null): PushSettings => {
  const [updating, setUpdating] = useState(false);

  const { data: subscription, refetch } = useQuery({
    queryKey: ["push-subscriptions", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("push_subscriptions")
        .select("endpoint, push_enabled, novidades")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!userId && isPushSupported(),
    staleTime: 30_000,
  });

  const permission = useMemo<PushPermission>(() => {
    if (!isPushSupported()) return "unsupported";
    return getPermission();
  }, [userId]);

  const subscribed = !!subscription;

  const togglePush = useCallback(async () => {
    setUpdating(true);
    try {
      if (subscription?.push_enabled) {
        await disablePush();
      } else {
        const { granted } = await enablePush({ pushEnabled: true, novidades: subscription?.novidades ?? false });
        if (!granted) return;
      }
      await refetch();
    } finally {
      setUpdating(false);
    }
  }, [subscription, refetch]);

  const setNovidades = useCallback(
    async (value: boolean) => {
      setUpdating(true);
      try {
        const existing = await getExistingSubscription();
        if (existing) {
          await saveSubscription(existing, { pushEnabled: true, novidades: value });
          await refetch();
        }
      } finally {
        setUpdating(false);
      }
    },
    [refetch]
  );

  return {
    permission,
    supported: isPushSupported(),
    subscribed,
    pushEnabled: subscription?.push_enabled ?? false,
    novidades: subscription?.novidades ?? false,
    updating,
    togglePush,
    setNovidades,
  };
};