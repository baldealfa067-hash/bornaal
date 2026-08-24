import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Wrench, Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { JUST_SIGNED_UP_KEY } from "@/lib/push";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/LanguageSelector";
import logo from "@/assets/logo.png";

type ProfileType = "provider" | "business" | "beleza";

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAdmin, isProvider, isBusiness, isBeleza, rolesLoaded, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("tab") === "registar" ? "signup" : "login"
  );
  const [profileType, setProfileType] = useState<ProfileType>("provider");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const signingUp = useRef(false);

  useEffect(() => {
    if (signingUp.current) return; // registo em curso: não roubar a navegação
    if (loading || !rolesLoaded) return;
    if (!user) return;
    if (isAdmin) navigate("/admin", { replace: true });
    else if (isProvider) navigate("/painel", { replace: true });
    else if (isBusiness) navigate("/painel-loja", { replace: true });
    else if (isBeleza) navigate("/painel-beleza", { replace: true });
    else navigate("/inicio", { replace: true });
  }, [user, isAdmin, isProvider, isBusiness, isBeleza, rolesLoaded, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.loginSuccess"));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error(t("auth.passwordMin"));
    if (!name.trim()) return toast.error(t("auth.enterName"));
    signingUp.current = true;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/painel`, data: { name } },
      });
      if (error || !data.user) {
        return toast.error(error?.message ?? t("auth.registerError"));
      }
      // Assign role while we have a session
      if (data.session) {
        const { error: roleErr } =
          profileType === "business"
            ? await supabase.rpc("register_as_business")
            : profileType === "beleza"
              ? await supabase.rpc("register_as_beleza")
              : await supabase.rpc("register_as_provider");
        if (roleErr) console.error("Role error:", roleErr);
        toast.success(t("auth.accountCreated"));
        sessionStorage.setItem(JUST_SIGNED_UP_KEY, "1");
        // Ir direto à página onde completa o perfil (configuração do negócio)
        navigate(
          profileType === "business"
            ? "/painel-loja/editar"
            : profileType === "beleza"
              ? "/painel-beleza/editar"
              : "/painel",
          { replace: true }
        );
      } else {
        toast.success(t("auth.accountCreated"));
      }
    } finally {
      signingUp.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      <Link to="/" className="mb-6 inline-block">
        <img src={logo} alt="Bornaal" className="h-14 md:h-16 w-auto" />
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t("auth.accessTitle")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("auth.accessSubtitle")}</p>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full mb-4 h-11">
              <TabsTrigger value="login" className="min-h-10">{t("auth.loginTab")}</TabsTrigger>
              <TabsTrigger value="signup" className="min-h-10">{t("auth.signupTab")}</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div className="space-y-1">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="text-right">
                  <Link to="/esqueci-senha" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {t("auth.forgotPassword")}
                  </Link>
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? t("auth.loggingIn") : t("auth.loginButton")}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="flex flex-col gap-3">
                <div className="space-y-2">
                  <Label>{t("auth.profileType")}</Label>
                  <div className="grid grid-cols-3 gap-2">
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
                      <span className="text-xs font-medium">{t("auth.providerProfile")}</span>
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
                      <span className="text-xs font-medium">{t("auth.businessProfile")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileType("beleza")}
                      className={
                        "flex flex-col items-center gap-1 rounded-lg border p-3 min-h-20 text-center transition-colors " +
                        (profileType === "beleza"
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:bg-muted text-muted-foreground")
                      }
                    >
                      <Scissors className="h-5 w-5" />
                      <span className="text-xs font-medium">{t("auth.belezaProfile")}</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="name">{profileType === "provider" ? t("auth.name") : t("auth.businessName")}</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email-s">{t("auth.email")}</Label>
                  <Input id="email-s" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password-s">{t("auth.password")}</Label>
                  <Input id="password-s" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting
                    ? t("auth.creatingAccount")
                    : profileType === "business"
                      ? t("auth.createBusinessAccount")
                      : profileType === "beleza"
                        ? t("auth.createBelezaAccount")
                        : t("auth.createProviderAccount")}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  {profileType === "business"
                    ? t("auth.afterBusiness")
                    : profileType === "beleza"
                      ? t("auth.afterBeleza")
                      : t("auth.afterProvider")}
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