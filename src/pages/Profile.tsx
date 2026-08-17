import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, Briefcase, Loader2, Eye, MessageCircle, Phone, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useProviderStatsRealtime } from "@/hooks/useProviderStats";
import { toast } from "sonner";

type ProviderProfile = {
  name: string;
  category: string;
  phone: string;
  location: string;
  description: string | null;
  photo_url: string | null;
  price_type: string;
  starting_price: number | null;
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, isProvider, isAdmin, roles, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ profile_views: number; whatsapp_clicks: number; call_clicks: number }>({ profile_views: 0, whatsapp_clicks: 0, call_clicks: 0 });
  const [commentCount, setCommentCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (isAdmin) {
      navigate("/admin", { replace: true });
      return;
    }
    if (isProvider) {
      supabase
        .from("profiles")
        .select("id, name, category, phone, location, description, photo_url, price_type, starting_price")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setProfile(data as ProviderProfile);
            setProfileId((data as { id?: string }).id ?? null);
          }
        });
    }
  }, [user, isAdmin, isProvider, loading, navigate]);

  useEffect(() => {
    if (!profileId) return;
    supabase
      .from("provider_stats")
      .select("profile_views, whatsapp_clicks, call_clicks")
      .eq("provider_id", profileId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStats({
            profile_views: data.profile_views ?? 0,
            whatsapp_clicks: data.whatsapp_clicks ?? 0,
            call_clicks: data.call_clicks ?? 0,
          });
        }
      });
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", profileId)
      .then(({ count }) => setCommentCount(count ?? 0));
  }, [profileId]);

  useProviderStatsRealtime(profileId, (newStats) => {
    setStats(newStats);
    setLastUpdate(new Date());
  });

  const handleLogout = async () => {
    await signOut();
    toast.success("Sessão encerrada");
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || isAdmin) return null;

  const email = user.email ?? "";
  const initials = (profile?.name ?? email).slice(0, 2).toUpperCase();

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Meu Perfil</h1>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            {profile?.photo_url ? (
              <AvatarImage src={profile.photo_url} alt={profile.name} />
            ) : null}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">
              {profile?.name ?? email}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {profile ? profile.category : roles.length > 0 ? roles.join(", ") : "cliente"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 mt-4">
          {isProvider && profile && (
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefone</span>
                <span className="font-medium">{profile.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Localização</span>
                <span className="font-medium">{profile.location}</span>
              </div>
              {profile.price_type === "fixo" && profile.starting_price != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço</span>
                  <span className="font-medium">{profile.starting_price} FCFA</span>
                </div>
              )}
              {profile.price_type === "negociavel" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço</span>
                  <span className="font-medium">Negociável</span>
                </div>
              )}
              {profile.price_type === "combinar" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço</span>
                  <span className="font-medium">A combinar</span>
                </div>
              )}
              {profile.description && (
                <div>
                  <span className="text-muted-foreground">Descrição</span>
                  <p className="mt-1">{profile.description}</p>
                </div>
              )}
            </div>
          )}
          {isProvider && (
            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold mb-3">Estatísticas do perfil</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <span><span className="font-bold">{stats.profile_views}</span> <span className="text-muted-foreground">vistas</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[#25D366]" />
                  <span><span className="font-bold">{stats.whatsapp_clicks}</span> <span className="text-muted-foreground">WhatsApp</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-secondary-foreground" />
                  <span><span className="font-bold">{stats.call_clicks}</span> <span className="text-muted-foreground">ligações</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                  <span><span className="font-bold">{commentCount}</span> <span className="text-muted-foreground">comentários</span></span>
                </div>
              </div>
              {lastUpdate && (
                <p className="text-xs text-muted-foreground mt-2">
                  Última atualização: {lastUpdate.toLocaleTimeString('pt-BW')} (polling 15s + realtime)
                </p>
              )}
            </div>
          )}
          {isProvider && (
            <Button variant="outline" onClick={() => navigate("/painel")} className="w-full justify-start gap-2">
              <Settings className="h-4 w-4" />
              Editar perfil de prestador
            </Button>
          )}
          {!isProvider && !isAdmin && (
            <Button variant="outline" onClick={() => navigate("/painel")} className="w-full justify-start gap-2">
              <Briefcase className="h-4 w-4" />
              Tornar-me prestador
            </Button>
          )}
          <Button variant="destructive" onClick={handleLogout} className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" />
            Terminar sessão
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
