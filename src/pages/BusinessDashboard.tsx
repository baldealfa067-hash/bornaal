import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  ArrowLeft,
  Upload,
  Loader2,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileCheck2,
  Eye,
  MessageCircle,
  Phone,
  MessageSquareText,
  Store,
  UtensilsCrossed,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProviderStatsQuery } from "@/hooks/useProviderStats";
import { useCategories } from "@/hooks/useProviders";
import { useBairros } from "@/hooks/useBairros";
import { toast } from "sonner";
import { LOCATION_OPTIONS } from "@/lib/locations";
import { canSubmitVerification, verificationDescription } from "@/lib/verification";
import ManageList from "@/components/ManageList";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatCFA } from "@/lib/format";

type ConsumptionOption = "comer_no_local" | "para_levar" | "entrega";

const CONSUMPTION_OPTIONS: { value: ConsumptionOption; label: string; description: string }[] = [
  { value: "comer_no_local", label: "Comer no local", description: "Clientes podem comer no estabelecimento" },
  { value: "para_levar", label: "Para levar", description: "Retirar no balcão" },
  { value: "entrega", label: "Entrega", description: "O próprio estabelecimento entrega" },
];

type Form = {
  name: string;
  category: string;
  phone: string;
  location: string;
  description: string;
  photo_url: string;
  consumption_options: ConsumptionOption[];
};

const empty: Form = {
  name: "",
  category: "",
  phone: "",
  location: "",
  description: "",
  photo_url: "",
  consumption_options: [],
};

type MenuCategory = { id: string; name: string };
type MenuItem = { id: string; name: string; price: number; photo_url: string | null; category_id: string | null };

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { user, isBusiness, isAdmin, loading, signOut } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: categories = [] } = useCategories();
  const { data: bairros = [] } = useBairros();
  const locationOptions = bairros.length ? bairros : LOCATION_OPTIONS;
  const [verificationStatus, setVerificationStatus] = useState<string>("none");
  const [verificationReason, setVerificationReason] = useState<string | null>(null);
  const [verifyDoc, setVerifyDoc] = useState<File | null>(null);
  const [verifySelfie, setVerifySelfie] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const verifyDocRef = useRef<HTMLInputElement>(null);
  const verifySelfieRef = useRef<HTMLInputElement>(null);
  const [commentCount, setCommentCount] = useState(0);
  const { data: stats = { profile_views: 0, whatsapp_clicks: 0, call_clicks: 0 } } = useProviderStatsQuery(profileId);

  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  const [itemForm, setItemForm] = useState({ name: "", price: "", category_id: "", photo_url: "" });
  const [itemUploading, setItemUploading] = useState(false);
  const itemFileRef = useRef<HTMLInputElement>(null);

  const loadMenu = async (pid: string) => {
    const [{ data: cats }, { data: items }, { count: orders }] = await Promise.all([
      supabase.from("menu_categories").select("id, name").eq("business_id", pid).order("name"),
      supabase.from("menu_items").select("id, name, price, photo_url, category_id").eq("business_id", pid).order("name"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("business_id", pid),
    ]);
    setMenuCategories((cats ?? []) as MenuCategory[]);
    setMenuItems((items ?? []) as MenuItem[]);
    setOrderCount(orders ?? 0);
  };

  useEffect(() => {
    if (!profileId) return;
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", profileId)
      .then(({ count }) => setCommentCount(count ?? 0));
  }, [profileId]);

  useEffect(() => {
    if (loading) return;
    if (!user) return navigate("/login", { replace: true });
    if (!isBusiness && !isAdmin) return navigate("/inicio", { replace: true });
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setProfileId(data.id);
        setVerificationStatus(data.verification_status ?? "none");
        setVerificationReason(data.verification_reason);
        setForm({
          name: data.name ?? "",
          category: data.category ?? "",
          phone: data.phone ?? "",
          location: data.location ?? "",
          description: data.description ?? "",
          photo_url: data.photo_url ?? "",
          consumption_options: ((data.consumption_options ?? []) as ConsumptionOption[]).filter((o) =>
            ["comer_no_local", "para_levar", "entrega"].includes(o)
          ),
        });
        loadMenu(data.id);
      }
      setFetching(false);
    })();
  }, [user, isBusiness, isAdmin, loading, navigate]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem demasiado grande (máx 5MB)");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm((f) => ({ ...f, photo_url: data.publicUrl }));
    setUploading(false);
    toast.success("Foto carregada");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleItemPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem demasiado grande (máx 5MB)");
    setItemUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/menu/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("portfolio").upload(path, file, { contentType: file.type });
    if (error) { setItemUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("portfolio").getPublicUrl(path);
    setItemForm((f) => ({ ...f, photo_url: data.publicUrl }));
    setItemUploading(false);
    toast.success("Foto do item carregada");
    if (itemFileRef.current) itemFileRef.current.value = "";
  };

  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profileId) return;
    if (!verifyDoc || !verifySelfie) return toast.error("Envie o documento de identificação e a selfie");
    if (verifyDoc.size > 5 * 1024 * 1024 || verifySelfie.size > 5 * 1024 * 1024) {
      return toast.error("Ficheiros demasiado grandes (máx 5MB cada)");
    }
    setVerifying(true);
    const ext = (f: File) => f.name.split(".").pop()?.toLowerCase() || "jpg";
    const docPath = `${user.id}/doc-${Date.now()}.${ext(verifyDoc)}`;
    const selfiePath = `${user.id}/selfie-${Date.now()}.${ext(verifySelfie)}`;
    const { error: docErr } = await supabase.storage.from("verification").upload(docPath, verifyDoc, { contentType: verifyDoc.type });
    if (docErr) { setVerifying(false); return toast.error(docErr.message); }
    const { error: selfieErr } = await supabase.storage.from("verification").upload(selfiePath, verifySelfie, { contentType: verifySelfie.type });
    if (selfieErr) { setVerifying(false); return toast.error(selfieErr.message); }
    const { error } = await supabase.from("profiles").update({
      verification_status: "pendente",
      verification_doc_url: docPath,
      verification_selfie_url: selfiePath,
      verification_reason: null,
      verification_submitted_at: new Date().toISOString(),
    }).eq("id", profileId);
    setVerifying(false);
    if (error) return toast.error(error.message);
    setVerificationStatus("pendente");
    setVerificationReason(null);
    setVerifyDoc(null);
    setVerifySelfie(null);
    toast.success("Verificação submetida! Aguarde a análise do administrador.");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name || !form.category || !form.phone || !form.location) {
      return toast.error("Nome, categoria, telefone e localização são obrigatórios");
    }
    if (!form.consumption_options.length) {
      return toast.error("Selecione pelo menos uma opção de consumo");
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      description: form.description.trim() || null,
      photo_url: form.photo_url.trim() || null,
      consumption_options: form.consumption_options,
      profile_type: "business",
      price_type: "combinar",
      user_id: user.id,
    };
    const { error, data } = profileId
      ? await supabase.from("profiles").update(payload).eq("id", profileId).select().single()
      : await supabase.from("profiles").insert(payload).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    if (data) {
      setProfileId(data.id);
      await supabase.rpc("register_as_business");
    }
    toast.success("Perfil guardado!");
  };

  const addMenuCategory = async (name: string) => {
    if (!profileId) return;
    const { error } = await supabase.from("menu_categories").insert({ business_id: profileId, name });
    if (error) return toast.error(error.message);
    toast.success("Categoria adicionada");
    loadMenu(profileId);
  };

  const renameMenuCategory = async (id: string, name: string) => {
    if (!profileId) return;
    const { error } = await supabase.from("menu_categories").update({ name }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Categoria atualizada");
    loadMenu(profileId);
  };

  const removeMenuCategory = async (id: string) => {
    if (!profileId) return;
    const { error } = await supabase.from("menu_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Categoria eliminada");
    loadMenu(profileId);
  };

  const addMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;
    if (!itemForm.name.trim()) return toast.error("Indique o nome do prato/produto");
    const price = parseFloat(itemForm.price);
    if (isNaN(price) || price < 0) return toast.error("Indique um preço válido");
    const { error } = await supabase.from("menu_items").insert({
      business_id: profileId,
      category_id: itemForm.category_id || null,
      name: itemForm.name.trim(),
      price,
      photo_url: itemForm.photo_url || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Item adicionado ao menu");
    setItemForm({ name: "", price: "", category_id: "", photo_url: "" });
    loadMenu(profileId);
  };

  const removeMenuItem = async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Item removido");
    if (profileId) loadMenu(profileId);
  };

  const categoryName = (cid: string | null) => menuCategories.find((c) => c.id === cid)?.name ?? "Sem categoria";

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

      <main className="max-w-2xl mx-auto px-4 py-6 pb-[calc(env(safe-area-inset-bottom))]">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Store className="h-6 w-6 text-primary" /> Meu estabelecimento
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {profileId ? "Atualize os dados, opções de consumo e o menu." : "Complete o perfil para ficar visível na plataforma."}
        </p>

        <Card>
          <CardHeader><CardTitle className="text-base">Dados do estabelecimento</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 rounded-xl">
                  {form.photo_url ? <AvatarImage src={form.photo_url} className="object-cover" /> : null}
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xl font-bold">
                    {form.name.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2 min-h-11"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Carregar Foto do Estabelecimento
                  </Button>
                  <p className="text-[11px] text-muted-foreground mt-1">JPG ou PNG, máx 5MB</p>
                </div>
              </div>
              <Field label="Nome do estabelecimento *">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Categoria *">
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Telefone (WhatsApp) *">
                  <Input placeholder="+245 955 000 000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
                <Field label="Localização *">
                  <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Descrição">
                <Textarea rows={4} placeholder="Fale sobre o seu estabelecimento, especialidades, horário..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <Field label="Opções de consumo oferecidas *">
                <p className="text-[11px] text-muted-foreground -mt-1">Pode escolher mais do que uma.</p>
                <div className="flex flex-col gap-2">
                  {CONSUMPTION_OPTIONS.map((opt) => {
                    const active = form.consumption_options.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            consumption_options: active
                              ? form.consumption_options.filter((o) => o !== opt.value)
                              : [...form.consumption_options, opt.value],
                          })
                        }
                        className={
                          "flex items-start gap-2 rounded-lg border p-3 text-left transition-colors " +
                          (active ? "border-primary bg-primary/5" : "hover:bg-muted")
                        }
                      >
                        <span className={
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
                          (active ? "border-primary bg-primary" : "border-border")
                        }>
                          {active && <span className="h-2 w-2 rounded-full bg-white" />}
                        </span>
                        <span className="min-w-0">
                          <span className={"block text-sm font-medium " + (active ? "text-primary" : "")}>{opt.label}</span>
                          <span className="block text-[11px] text-muted-foreground">{opt.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "A guardar..." : profileId ? "Guardar alterações" : "Criar perfil"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {profileId && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-primary" /> Menu
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Organize o menu por categorias. Os clientes veem esta página publicamente.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div>
                <h3 className="text-sm font-semibold mb-2">Categorias do menu</h3>
                <ManageList
                  placeholder="Nova categoria (ex: Pratos principais)"
                  items={menuCategories}
                  onAdd={addMenuCategory}
                  onRename={renameMenuCategory}
                  onDelete={(id) => setCategoryToDelete(menuCategories.find((c) => c.id === id) ?? null)}
                  emptyText="Sem categorias. Crie a primeira para organizar o menu."
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Itens do menu ({menuItems.length})</h3>
                <form onSubmit={addMenuItem} className="grid gap-3 rounded-lg border p-3 mb-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Nome do prato/produto *</Label>
                      <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="ex: Arroz de marisco" />
                    </div>
                    <div className="space-y-1">
                      <Label>Preço (CFA) *</Label>
                      <Input type="number" min="0" step="0.01" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} placeholder="ex: 4500" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Categoria do menu</Label>
                    <Select value={itemForm.category_id} onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                      <SelectContent>
                        {menuCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={itemFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleItemPhotoUpload}
                    />
                    <Button type="button" variant="outline" disabled={itemUploading} onClick={() => itemFileRef.current?.click()} className="gap-2 min-h-11">
                      {itemUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {itemForm.photo_url ? "Foto escolhida (trocar)" : "Foto (opcional)"}
                    </Button>
                    {itemForm.photo_url && (
                      <img src={itemForm.photo_url} alt="Prato" className="h-9 w-9 rounded-lg object-cover border" />
                    )}
                  </div>
                  <Button type="submit" className="gap-1 w-full">
                    <Plus className="h-4 w-4" /> Adicionar item
                  </Button>
                </form>
                <div className="flex flex-col gap-2">
                  {menuItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                      {item.photo_url ? (
                        <img src={item.photo_url} alt={item.name} className="h-11 w-11 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                          <UtensilsCrossed className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{formatCFA(item.price)} · <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{categoryName(item.category_id)}</Badge></div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {!menuItems.length && <p className="text-sm text-muted-foreground text-center py-4">O menu ainda não tem itens.</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {profileId && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {verificationStatus === "aprovado" && <ShieldCheck className="h-5 w-5 text-green-600" />}
                {verificationStatus === "pendente" && <ShieldAlert className="h-5 w-5 text-yellow-600" />}
                {verificationStatus === "rejeitado" && <ShieldX className="h-5 w-5 text-destructive" />}
                {verificationStatus === "none" && <ShieldCheck className="h-5 w-5 text-muted-foreground" />}
                Verificação de Identidade
              </CardTitle>
              {verificationStatus !== "aprovado" && (
                <p className="text-xs text-muted-foreground">
                  Confirme a identidade do responsável para receber o selo de estabelecimento verificado.
                </p>
              )}
            </CardHeader>
            <CardContent>
              {verificationStatus === "aprovado" && (
                <div className="flex items-center gap-2 text-green-700">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-sm font-medium">{verificationDescription(verificationStatus)}</span>
                </div>
              )}

              {verificationStatus === "pendente" && (
                <p className="text-sm text-yellow-700">
                  {verificationDescription(verificationStatus)}
                </p>
              )}

              {verificationStatus === "rejeitado" && (
                <div className="mb-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <p className="font-medium">{verificationDescription(verificationStatus)}</p>
                  {verificationReason && <p className="mt-1">Motivo: {verificationReason}</p>}
                </div>
              )}

              {canSubmitVerification(verificationStatus) && (
                <form onSubmit={submitVerification} className="grid gap-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Documento de identificação (BI / Passaporte)</Label>
                      <input ref={verifyDocRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setVerifyDoc(e.target.files?.[0] ?? null)} />
                      <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => verifyDocRef.current?.click()}>
                        <FileCheck2 className="h-4 w-4" />
                        {verifyDoc ? verifyDoc.name : "Escolher documento"}
                      </Button>
                    </div>
                    <div>
                      <Label>Selfie (foto do responsável)</Label>
                      <input ref={verifySelfieRef} type="file" accept="image/*" className="hidden" onChange={(e) => setVerifySelfie(e.target.files?.[0] ?? null)} />
                      <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => verifySelfieRef.current?.click()}>
                        <Upload className="h-4 w-4" />
                        {verifySelfie ? verifySelfie.name : "Escolher selfie"}
                      </Button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Apenas o administrador terá acesso aos seus ficheiros. JPG, PNG ou PDF, máx 5MB cada.
                  </p>
                  <Button type="submit" disabled={verifying} className="w-full">
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {verifying ? "A submeter..." : "Submeter para verificação"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {profileId && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Estatísticas do perfil</CardTitle>
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
        )}

        {profileId && (
          <div className="mt-4 flex justify-center">
            <Link to={`/loja/${profileId}`} className="text-xs text-primary hover:underline">
              Ver página pública do estabelecimento
            </Link>
          </div>
        )}

        <ConfirmDialog
          open={categoryToDelete !== null}
          onOpenChange={(o) => { if (!o) setCategoryToDelete(null); }}
          title="Eliminar categoria"
          description="Eliminar esta categoria? Os itens ficam sem categoria."
          confirmLabel="Eliminar"
          destructive
          onConfirm={() => {
            if (categoryToDelete) removeMenuCategory(categoryToDelete.id);
            setCategoryToDelete(null);
          }}
        />

        <ConfirmDialog
          open={itemToDelete !== null}
          onOpenChange={(o) => { if (!o) setItemToDelete(null); }}
          title="Remover item"
          description={itemToDelete ? `Remover "${itemToDelete.name}" do menu?` : ""}
          confirmLabel="Remover"
          destructive
          onConfirm={() => {
            if (itemToDelete) removeMenuItem(itemToDelete.id);
            setItemToDelete(null);
          }}
        />
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

export default BusinessDashboard;