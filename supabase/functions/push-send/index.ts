import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rest = (path: string) =>
  fetch(`${supabaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
  });

interface SubscriptionRow {
  endpoint: string;
  keys: { p256dh?: string; auth?: string };
}

async function getSubscriptions(path: string): Promise<SubscriptionRow[]> {
  const res = await rest(path);
  if (!res.ok) throw new Error(`DB query failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<SubscriptionRow[]>;
}

function sendPush(
  sub: SubscriptionRow,
  payload: { title: string; body: string; url: string }
): Promise<{ ok: boolean; gone: boolean; status: number }> {
  return new Promise((resolve) => {
    const request = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys?.p256dh ?? "",
        auth: sub.keys?.auth ?? "",
      },
    } as webpush.PushSubscription;
    webpush
      .sendNotification(request, JSON.stringify(payload), { TTL: 86400 })
      .then(() => resolve({ ok: true, gone: false, status: 201 }))
      .catch((err) => {
        const status = err?.statusCode ?? 0;
        const gone = status === 404 || status === 410 || status === 403;
        resolve({ ok: false, gone, status });
      });
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const payload = (await req.json()) as {
      kind?: "notification" | "novidades";
      user_id?: string;
      type?: string;
      title?: string;
      body?: string;
      link?: string;
      location?: string;
      name?: string;
      category?: string;
      profile_type?: string;
      author_user_id?: string;
    };

    let subscriptions: SubscriptionRow[] = [];
    let pushes: { title: string; body: string; url: string }[] = [];

    if (payload.kind === "notification") {
      if (!payload.user_id || !payload.title) {
        return new Response("missing user_id/title", { status: 400, headers: corsHeaders });
      }
      subscriptions = await getSubscriptions(
        `/rest/v1/push_subscriptions?user_id=eq.${payload.user_id}&push_enabled=eq.true&select=endpoint,keys`
      );
      pushes = [{ title: payload.title, body: payload.body ?? "", url: payload.link ?? "/" }];
    } else if (payload.kind === "novidades") {
      if (!payload.location) {
        return new Response("missing location", { status: 400, headers: corsHeaders });
      }
      // Utilizadores com a opção "novidades" ativa e no mesmo bairro
      const search = encodeURIComponent(`"${payload.location}"`);
      subscriptions = await getSubscriptions(
        `/rest/v1/push_subscriptions?push_enabled=eq.true&novidades=eq.true&select=endpoint,keys,user_id`
      );
      const filtered: SubscriptionRow[] = [];
      for (const s of subscriptions) {
        const profileRes = await rest(
          `/rest/v1/profiles?user_id=eq.${s.user_id}&select=location,user_id`
        );
        if (!profileRes.ok) continue;
        const profiles = await profileRes.json();
        const match =
          profiles.length > 0 &&
          profiles[0].location === payload.location &&
          (payload.author_user_id === "" || profiles[0].user_id !== payload.author_user_id);
        if (match) filtered.push(s);
      }
      subscriptions = filtered;
      const isBusiness = payload.profile_type === "business";
      const what = isBusiness ? "restaurante/loja" : "prestador";
      pushes = [
        {
          title: "Novidade perto de ti",
          body: `${payload.name ?? "Alguém"} — novo ${what} de ${payload.category ?? ""} em ${payload.location}.`,
          url: "/explorar",
        },
      ];
    } else {
      return new Response("unknown kind", { status: 400, headers: corsHeaders });
    }

    const results = await Promise.all(
      subscriptions.flatMap((sub) =>
        pushes.map((p) => sendPush(sub, p).then((r) => ({ endpoint: sub.endpoint, ...r })))
      )
    );

    // Remove subscrições expiradas/inválidas (410/404/403)
    const gone = results.filter((r) => r.gone);
    for (const g of gone) {
      fetch(`${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(g.endpoint)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({ sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(`error: ${err.message}`, { status: 500, headers: corsHeaders });
  }
});