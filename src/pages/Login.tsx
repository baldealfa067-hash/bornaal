import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAdmin, isProvider, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("tab") === "registar" ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (isAdmin) navigate("/admin", { replace: true });
    else if (isProvider) navigate("/painel", { replace: true });
    else navigate("/inicio", { replace: true });
  }, [user, isAdmin, isProvider, loading, navigate]);

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
    // Wait for session, then assign provider role
    if (data.session) {
      const { error: roleErr } = await supabase.rpc("register_as_provider");
      if (roleErr) console.error("Role error:", roleErr);
    }
    setSubmitting(false);
    toast.success("Conta criada. A entrar...");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <Link to="/" className="mb-6 inline-block">
        <img src={logo} alt="Bornaal" className="h-14 md:h-16 w-auto" />
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Acesso</CardTitle>
          <p className="text-xs text-muted-foreground">Para administradores e prestadores de serviços.</p>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Registar prestador</TabsTrigger>
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
                <div className="space-y-1">
                  <Label htmlFor="name">Nome</Label>
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
                  {submitting ? "A criar conta..." : "Criar conta de prestador"}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Depois de entrar, complete o seu perfil para aparecer no diretório.
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