import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getExistingSubscription,
  isPushSupported,
  saveSubscription,
  subscribeToPush,
  subscriptionMatchesVapidKey,
} from "@/lib/push";

/**
 * Repara silenciosamente subscrições push quebradas:
 * - chaves p256dh/auth vazias na BD (bug antigo que as gravava vazias)
 * - subscrição do navegador ligada a uma chave VAPID antiga (cache)
 * Corre automaticamente sempre que a app abre com sessão.
 */
const PushRepair = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !isPushSupported()) return;
    (async () => {
      try {
        const existing = await getExistingSubscription();
        if (!existing) return;
        const { data } = await supabase
          .from("push_subscriptions")
          .select("push_enabled, novidades, keys")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (!data) return;
        const keys = data.keys as { p256dh?: string } | null | undefined;
        if (keys?.p256dh && subscriptionMatchesVapidKey(existing)) return;
        const options = {
          pushEnabled: data.push_enabled ?? true,
          novidades: data.novidades ?? false,
        };
        if (!subscriptionMatchesVapidKey(existing)) {
          await existing.unsubscribe().catch(() => {});
          const fresh = await subscribeToPush();
          if (!fresh) return;
          await saveSubscription(fresh, options);
        } else {
          await saveSubscription(existing, options);
        }
      } catch (e) {
        console.error("push repair failed:", e);
      }
    })();
  }, [user]);

  return null;
};

export default PushRepair;