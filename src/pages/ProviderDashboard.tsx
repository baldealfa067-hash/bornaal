import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Form = {
  name: string;
  category: string;
  phone: string;
  location: string;
  description: string;
  photo_url: string;
  starting_price: string;
};

const empty: Form = { name: "", category: "", phone: "", location: "", description: "", photo_url: "", starting_price: "" };

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const { user, isProvider, isAdmin, loading, signOut } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) return navigate("/login", { replace: true });
    if (!isProvider && !isAdmin) return navigate("/login", { replace: true });
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setProfileId(data.id);
        setForm({
          name: data.name ?? "",
          category: data.category ?? "",
          phone: data.phone ?? "",
          location: data.location ?? "",
          description: data.description ?? "",
          photo_url: data.photo_url ?? "",
          starting_price: data.starting_price?.toString() ?? "",
        });
      }
      setFetching(false);
    })();
  }, [user, isProvider, isAdmin, loading, navigate]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name || !form.category || !form.phone || !form.location) {
      return toast.error("Nome, categoria, telefone e localização são obrigatórios");
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      description: form.description.trim() || null,
      photo_url: form.photo_url.trim() || null,
      starting_price: form.starting_price ? parseInt(form.starting_price, 10) : null,
      user_id: user.id,
    };
    const { error, data } = profileId
      ? await supabase.from("profiles").update(payload).eq("id", profileId).select().single()
      : await supabase.from("profiles").insert(payload).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    if (data) setProfileId(data.id);
    toast.success("Perfil guardado");
  };

  if (loading || fetching) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">A carregar...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Início
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/admin"><Button variant="outline" size="sm">Admin</Button></Link>
            )}
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate("/"))} className="gap-1">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-1">Meu perfil de prestador</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {profileId ? "Atualize os seus dados." : "Complete o perfil para aparecer no diretório."}
        </p>

        <Card>
          <CardHeader><CardTitle className="text-base">Dados</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid gap-4">
              <Field label="Nome *">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Categoria *">
                <Input placeholder="ex: Electricista, Pintor, Cabeleireira..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefone (WhatsApp) *">
                  <Input placeholder="+245 955 000 000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
                <Field label="Localização *">
                  <Input placeholder="ex: Bissau" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </Field>
              </div>
              <Field label="Preço inicial (CFA)">
                <Input type="number" min="0" placeholder="ex: 10000" value={form.starting_price} onChange={(e) => setForm({ ...form, starting_price: e.target.value })} />
              </Field>
              <Field label="URL da foto">
                <Input placeholder="https://..." value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
              </Field>
              <Field label="Descrição">
                <Textarea rows={4} placeholder="Fale sobre o seu trabalho, experiência, serviços..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "A guardar..." : profileId ? "Guardar alterações" : "Criar perfil"}
              </Button>
              {profileId && (
                <Link to={`/prestador/${profileId}`} className="text-xs text-center text-primary hover:underline">
                  Ver perfil público
                </Link>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label>{label}</Label>
    {children}
  </div>
);

export default ProviderDashboard;