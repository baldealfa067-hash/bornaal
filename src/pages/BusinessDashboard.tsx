import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  ArrowLeft,
  Loader2,
  Settings,
  Eye,
  MessageCircle,
  Phone,
  MessageSquareText,
  Store,
  ShoppingCart,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProviderStatsQuery } from "@/hooks/useProviderStats";
import { useQueryClient } from "@tanstack/react-query";

type DashboardProfile = {
  id: string;
  name: string;
  category: string;
  photo_url: string | null;
  verification_status: string;
};

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { user, isBusiness, isAdmin, loading, signOut } = useAuth();
  const qc = useQueryClient();
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [orderCount, setOrderCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const { data: stats = { profile_views: 0, whatsapp_clicks: 0, call_clicks: 0 } } = useProviderStatsQuery(profile?.id ?? null);

  useEffect(() => {
    if (loading) return;
    if (!user) return navigate("/login", { replace: true });
    if (!isBusiness && !isAdmin) return navigate("/inicio", { replace: true });
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, category, photo_url, verification_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setProfile(data as DashboardProfile);
        const [{ count: orders }, { count: reviews }] = await Promise.all([
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("business_id", data.id),
          supabase.from("reviews").select("id", { count: "exact", head: true }).eq("provider_id", data.id),
        ]);
        setOrderCount(orders ?? 0);
        setCommentCount(reviews ?? 0);
      }
      setFetching(false);
    })();
  }, [user, isBusiness, isAdmin, loading, navigate]);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`business-stats-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "provider_stats", filter: `provider_id=eq.${profile.id}` },
        () => { qc.invalidateQueries({ queryKey: ["provider-stats", profile.id] }); }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `business_id=eq.${profile.id}` },
        () => setOrderCount((c) => c + 1)
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reviews", filter: `provider_id=eq.${profile.id}` },
        () => setCommentCount((c) => c + 1)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, qc]);

  if (loading || fetching) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">A carregar...</div>;
  }

  const initials = (profile?.name ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground p-2 -m-2 rounded-md">
            <ArrowLeft className="h-4 w-4" /> Início
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/admin"><Button variant="outline" size="sm">Admin</Button></Link>
            )}
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate("/"))} className="gap-1 min-h-11">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-[calc(env(safe-area-inset-bottom))]">
        {!profile ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Store className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">Ainda não criaste o teu perfil de estabelecimento.</p>
              <Button onClick={() => navigate("/painel-loja/editar")} className="gap-2">
                <Settings className="h-4 w-4" /> Criar perfil de estabelecimento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-16 w-16 rounded-xl">
                {profile.photo_url ? <AvatarImage src={profile.photo_url} className="object-cover" /> : null}
                <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-xl font-bold truncate">{profile.name}</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  {profile.category}
                  {profile.verification_status === "aprovado" && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                      <ShieldCheck className="h-3 w-3 text-green-600" /> Verificado
                    </Badge>
                  )}
                  {profile.verification_status === "pendente" && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                      <ShieldAlert className="h-3 w-3 text-yellow-600" /> Verificação pendente
                    </Badge>
                  )}
                  {profile.verification_status === "rejeitado" && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                      <ShieldX className="h-3 w-3 text-destructive" /> Verificação rejeitada
                    </Badge>
                  )}
                </p>
              </div>
            </div>

            <Button onClick={() => navigate("/painel-loja/editar")} className="w-full gap-2 min-h-11 mb-6">
              <Settings className="h-4 w-4" /> Configurar estabelecimento
            </Button>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" /> Estatísticas do perfil
                </CardTitle>
                <p className="text-xs text-muted-foreground">Como os clientes interagem com o seu estabelecimento.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="rounded-lg border p-3 flex flex-col items-center gap-1">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{orderCount}</span>
                    <span className="text-[11px] text-muted-foreground text-center">Pedidos recebidos</span>
                  </div>
                  <div className="rounded-lg border p-3 flex flex-col items-center gap-1">
                    <Eye className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{stats.profile_views}</span>
                    <span className="text-[11px] text-muted-foreground text-center">Vistas do perfil</span>
                  </div>
                  <div className="rounded-lg border p-3 flex flex-col items-center gap-1">
                    <MessageCircle className="h-5 w-5 text-[#25D366]" />
                    <span className="text-2xl font-bold">{stats.whatsapp_clicks}</span>
                    <span className="text-[11px] text-muted-foreground text-center">Contactos WhatsApp</span>
                  </div>
                  <div className="rounded-lg border p-3 flex flex-col items-center gap-1">
                    <Phone className="h-5 w-5 text-secondary-foreground" />
                    <span className="text-2xl font-bold">{stats.call_clicks}</span>
                    <span className="text-[11px] text-muted-foreground text-center">Ligações</span>
                  </div>
                  <div className="rounded-lg border p-3 flex flex-col items-center gap-1">
                    <MessageSquareText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">{commentCount}</span>
                    <span className="text-[11px] text-muted-foreground text-center">Comentários</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 flex justify-center">
              <Link to={`/loja/${profile.id}`} className="text-xs text-primary hover:underline inline-flex items-center justify-center min-h-11 w-full">
                Ver página pública do estabelecimento
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default BusinessDashboard;