import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, ArrowLeft, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatCFA } from "@/lib/format";
import { useMyProposals, useSaveProposal, useDeleteProposal, type Proposal } from "@/hooks/useProposals";

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

        {profileId && <ProposalsSection providerId={profileId} category={form.category} location={form.location} />}
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

type ProposalForm = {
  id?: string;
  title: string;
  category: string;
  description: string;
  price: string;
  price_type: "fixo" | "desde";
  location: string;
  status: "ativa" | "pausada";
};

const emptyProposal = (category: string, location: string): ProposalForm => ({
  title: "", category: category || "", description: "", price: "",
  price_type: "desde", location: location || "", status: "ativa",
});

const ProposalsSection = ({ providerId, category, location }: { providerId: string; category: string; location: string }) => {
  const { data: proposals = [], isLoading } = useMyProposals(providerId);
  const save = useSaveProposal();
  const del = useDeleteProposal();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProposalForm>(emptyProposal(category, location));

  const startNew = () => { setForm(emptyProposal(category, location)); setOpen(true); };
  const startEdit = (p: Proposal) => {
    setForm({
      id: p.id, title: p.title, category: p.category, description: p.description,
      price: p.price.toString(), price_type: p.price_type, location: p.location, status: p.status,
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.category.trim() || !form.description.trim() || !form.location.trim() || !form.price) {
      return toast.error("Preencha todos os campos");
    }
    const price = parseInt(form.price, 10);
    if (isNaN(price) || price < 0) return toast.error("Preço inválido");
    try {
      await save.mutateAsync({
        id: form.id,
        provider_id: providerId,
        title: form.title.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        price,
        price_type: form.price_type,
        location: form.location.trim(),
        status: form.status,
      });
      toast.success(form.id ? "Proposta atualizada" : "Proposta publicada");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao guardar");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Eliminar esta proposta?")) return;
    try { await del.mutateAsync(id); toast.success("Eliminada"); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">As minhas propostas</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={startNew} className="gap-1">
              <Plus className="h-4 w-4" /> Nova
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar proposta" : "Nova proposta"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <Input placeholder="Título (ex: Instalação elétrica residencial)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} />
              <Input placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={60} />
              <Input placeholder="Localização" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={80} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.price_type} onValueChange={(v) => setForm({ ...form, price_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desde">Desde</SelectItem>
                    <SelectItem value="fixo">Fixo</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" min="0" placeholder="Preço (CFA)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <Textarea rows={4} placeholder="Descreva o serviço..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={800} />
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa (visível ao público)</SelectItem>
                  <SelectItem value="pausada">Pausada (oculta)</SelectItem>
                </SelectContent>
              </Select>
              <DialogFooter>
                <Button type="submit" disabled={save.isPending} className="w-full">
                  {save.isPending ? "A guardar..." : form.id ? "Guardar" : "Publicar proposta"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar...</p>
        ) : proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Ainda não publicou nenhuma proposta.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {proposals.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-2 p-3 rounded-lg border">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{p.title}</span>
                    <Badge variant={p.status === "ativa" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.category} · {p.location} · {p.price_type} {formatCFA(p.price)}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProviderDashboard;