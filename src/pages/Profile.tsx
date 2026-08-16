import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, Briefcase, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ProviderProfile = {
  name: string;
  category: string;
  phone: string;
  location: string;
  description: string | null;
  photo_url: string | null;
  starting_price: number | null;
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, isProvider, isAdmin, roles, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);

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
        .select("name, category, phone, location, description, photo_url, starting_price")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setProfile(data as ProviderProfile);
        });
    }
  }, [user, isAdmin, isProvider, loading, navigate]);

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
              {profile.starting_price != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço inicial</span>
                  <span className="font-medium">{profile.starting_price} FCFA</span>
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
            <Button variant="outline" onClick={() => navigate("/painel")} className="w-full justify-start gap-2">
              <Settings className="h-4 w-4" />
              Editar perfil de prestador
            </Button>
          )}
          {!isProvider && !isAdmin && (
            <Button variant="outline" onClick={() => navigate("/login?tab=registar")} className="w-full justify-start gap-2">
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
