import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { listener } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => listener.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Palavra-passe mínima de 6 caracteres");
    if (password !== confirmPassword) return toast.error("As palavras-passe não coincidem");
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return toast.error(updateError.message);
    }
    toast.success("Palavra-passe redefinida com sucesso!");
    navigate("/login", { replace: true });
  };

  if (!ready && !error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <Link to="/" className="mb-6 inline-block">
          <img src={logo} alt="Bornaal" className="h-14 md:h-16 w-auto" />
        </Link>
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">A validar link de recuperação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <Link to="/" className="mb-6 inline-block">
        <img src={logo} alt="Bornaal" className="h-14 md:h-16 w-auto" />
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Redefinir palavra-passe</CardTitle>
          <p className="text-xs text-muted-foreground">Introduza a sua nova palavra-passe.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="space-y-1">
              <Label htmlFor="password">Nova palavra-passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm">Confirmar palavra-passe</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Repita a palavra-passe"
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "A redefinir..." : "Redefinir palavra-passe"}
            </Button>
            <Link to="/login" className="text-sm text-center text-muted-foreground hover:text-foreground transition-colors">
              Voltar ao login
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
