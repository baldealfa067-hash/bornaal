import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { JUST_SIGNED_UP_KEY } from "@/lib/push";
import logo from "@/assets/logo.png";

type ProfileType = "provider" | "business";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAdmin, isProvider, isBusiness, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("tab") === "registar" ? "signup" : "login"
  );
  const [profileType, setProfileType] = useState<ProfileType>("provider");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (isAdmin) navigate("/admin", { replace: true });
    else if (isProvider) navigate("/painel", { replace: true });
    else if (isBusiness) navigate("/painel-loja", { replace: true });
    else navigate("/inicio", { replace: true });
  }, [user, isAdmin, isProvider, isBusiness, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Sessão iniciada");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Palavra-passe mínima de 6 caracteres");
    if (!name.trim()) return toast.error("Indique o seu nome");
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/painel`, data: { name } },
    });
    if (error || !data.user) {
      setSubmitting(false);
      return toast.error(error?.message ?? "Erro no registo");
    }
    // Wait for session, then assign role
    if (data.session) {
      const { error: roleErr } = profileType === "business"
        ? await supabase.rpc("register_as_business")
        : await supabase.rpc("register_as_provider");
      if (roleErr) console.error("Role error:", roleErr);
    }
    setSubmitting(false);
    toast.success("Conta criada. A entrar...");
    sessionStorage.setItem(JUST_SIGNED_UP_KEY, "1");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <Link to="/" className="mb-6 inline-block">
        <img src={logo} alt="Bornaal" className="h-14 md:h-16 w-auto" />
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Acesso</CardTitle>
          <p className="text-xs text-muted-foreground">Para administradores, prestadores de serviços e restaurantes/lojas.</p>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full mb-4 h-11">
              <TabsTrigger value="login" className="min-h-10">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="min-h-10">Registar</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password">Palavra-passe</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="text-right">
                  <Link to="/esqueci-senha" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Esqueceu a senha?
                  </Link>
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "A entrar..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="flex flex-col gap-3">
                <div className="space-y-2">
                  <Label>Tipo de perfil</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProfileType("provider")}
                      className={
                        "flex flex-col items-center gap-1 rounded-lg border p-3 min-h-20 text-center transition-colors " +
                        (profileType === "provider"
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:bg-muted text-muted-foreground")
                      }
                    >
                      <Wrench className="h-5 w-5" />
                      <span className="text-xs font-medium">Prestador de Serviço</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileType("business")}
                      className={
                        "flex flex-col items-center gap-1 rounded-lg border p-3 min-h-20 text-center transition-colors " +
                        (profileType === "business"
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:bg-muted text-muted-foreground")
                      }
                    >
                      <Store className="h-5 w-5" />
                      <span className="text-xs font-medium">Restaurante / Loja</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="name">{profileType === "business" ? "Nome do estabelecimento" : "Nome"}</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email-s">Email</Label>
                  <Input id="email-s" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password-s">Palavra-passe</Label>
                  <Input id="password-s" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "A criar conta..." : profileType === "business" ? "Criar conta de restaurante/loja" : "Criar conta de prestador"}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  {profileType === "business"
                    ? "Depois de entrar, complete o perfil do seu estabelecimento e adicione o menu."
                    : "Depois de entrar, complete o seu perfil para aparecer no diretório."}
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;