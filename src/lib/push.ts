import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ??
  "BCwM6omhrHEB-FbaML4IoPk89UmbNTSFoRufh2e4_JxPwHBwNzRj1Rk-c_FkjC5iz6hfv5VZzIVLrMTWpo7BgUs";

const ASKED_KEY = "bornaal:push-asked";
export const JUST_SIGNED_UP_KEY = "bornaal:just-signed-up";

export type PushPermission = "granted" | "denied" | "default" | "unsupported";

export const isPushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const isStandalone = (): boolean =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true);

export const getPermission = (): PushPermission => {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as PushPermission;
};

export const hasAsked = (): boolean => localStorage.getItem(ASKED_KEY) !== null;

export const markAsked = (): void => localStorage.setItem(ASKED_KEY, "1");

export const clearAsked = (): void => localStorage.removeItem(ASKED_KEY);

const urlBase64ToUint8Array = (base64: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Url);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
};

export const getExistingSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
};

export const subscribeToPush = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
};

export const unsubscribeFromPush = async (): Promise<void> => {
  const sub = await getExistingSubscription();
  if (sub) {
    await sub.unsubscribe().catch(() => {});
  }
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (userId) {
    await supabase.from("push_subscriptions").delete().eq("user_id", userId).catch(() => {});
  }
};

export const saveSubscription = async (
  subscription: PushSubscription,
  options: { pushEnabled: boolean; novidades: boolean }
): Promise<void> => {
  const key = (id: string) =>
    (subscription.toJSON() as { [k: string]: unknown })[id] as string | undefined;
  const endpoint = subscription.endpoint;
  const keys = { p256dh: key("p256dh") ?? "", auth: key("auth") ?? "" };
  const { error } = await supabase.rpc("upsert_push_subscription", {
    p_endpoint: endpoint,
    p_keys: keys,
    p_push_enabled: options.pushEnabled,
    p_novidades: options.novidades,
  });
  if (error) throw error;
};

/**
 * Ativa as notificações push: pede permissão e guarda a subscrição.
 * Deve ser chamado a partir de um gesto do utilizador (clique).
 */
export const enablePush = async (options: {
  pushEnabled?: boolean;
  novidades?: boolean;
} = {}): Promise<{ granted: boolean }> => {
  if (!isPushSupported()) return { granted: false };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    markAsked();
    return { granted: false };
  }
  const subscription = (await getExistingSubscription()) ?? (await subscribeToPush());
  if (!subscription) return { granted: false };
  await saveSubscription(subscription, {
    pushEnabled: options.pushEnabled ?? true,
    novidades: options.novidades ?? false,
  });
  markAsked();
  return { granted: true };
};

export const disablePush = async (): Promise<void> => {
  await unsubscribeFromPush();
};