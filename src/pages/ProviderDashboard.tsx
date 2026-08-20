import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, ArrowLeft, Upload, Loader2, Trash2, ImagePlus, ShieldCheck, ShieldAlert, ShieldX, FileCheck2, Eye, MessageCircle, Phone, MessageSquareText } from "lucide-react";
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
import { useProviderStatsQuery, useProviderActivity, useProviderActivityRealtime } from "@/hooks/useProviderStats";
import { toast } from "sonner";
import { LOCATION_OPTIONS } from "@/lib/locations";
import { canSubmitVerification, isVerifiedStatus, verificationDescription } from "@/lib/verification";
import { useCategories } from "@/hooks/useProviders";
import { useBairros } from "@/hooks/useBairros";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Form = {
  name: string;
  category: string;
  phone: string;
  location: string;
  description: string;
  photo_url: string;
  price_type: string;
  starting_price: string;
};

const empty: Form = { name: "", category: "", phone: "", location: "", description: "", photo_url: "", price_type: "combinar", starting_price: "" };

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const { user, isProvider, isAdmin, loading, signOut } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [gallery, setGallery] = useState<{ id: string; image_url: string }[]>([]);
  const [galleryDeleteId, setGalleryDeleteId] = useState<string | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const MAX_GALLERY = 4;
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

  const loadGallery = async (pid: string) => {
    const { data } = await supabase
      .from("portfolio_images")
      .select("id, image_url")
      .eq("provider_id", pid)
      .order("created_at", { ascending: false });
    setGallery((data ?? []) as { id: string; image_url: string }[]);
  };

  useEffect(() => {
    if (!profileId) return;
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", profileId)
      .then(({ count }) => setCommentCount(count ?? 0));
  }, [profileId]);

  useProviderActivityRealtime(profileId);
  const { data: activity = [] } = useProviderActivity(profileId);

  useEffect(() => {
    if (loading) return;
    if (!user) return navigate("/login", { replace: true });
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
          price_type: data.price_type ?? "combinar",
          starting_price: data.starting_price?.toString() ?? "",
        });
        loadGallery(data.id);
      }
      setFetching(false);
    })();
  }, [user, loading, navigate]);

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

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profileId) return;
    if (gallery.length >= MAX_GALLERY) return toast.error(`Máximo de ${MAX_GALLERY} fotos`);
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem demasiado grande (máx 5MB)");
    setGalleryUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("portfolio").upload(path, file, { contentType: file.type });
    if (upErr) { setGalleryUploading(false); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("portfolio").getPublicUrl(path);
    const { error: insErr } = await supabase
      .from("portfolio_images")
      .insert({ provider_id: profileId, image_url: pub.publicUrl });
    setGalleryUploading(false);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (insErr) return toast.error(insErr.message);
    toast.success("Foto adicionada à galeria");
    loadGallery(profileId);
  };

  const deleteGalleryImage = async (id: string) => {
    const { error } = await supabase.from("portfolio_images").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Foto removida");
    if (profileId) loadGallery(profileId);
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
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      description: form.description.trim() || null,
      photo_url: form.photo_url.trim() || null,
      price_type: form.price_type,
      starting_price: form.price_type === "fixo" ? (form.starting_price ? parseInt(form.starting_price, 10) : null) : null,
      user_id: user.id,
    };
    const { error, data } = profileId
      ? await supabase.from("profiles").update(payload).eq("id", profileId).select().single()
      : await supabase.from("profiles").insert(payload).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    if (data) setProfileId(data.id);
    // Garantir role de prestador (também quando o perfil já existe)
    await supabase.rpc("register_as_provider");
    toast.success("Perfil guardado!");
    if (data?.id) loadGallery(data.id);
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
        <h1 className="text-2xl font-bold mb-1">Meu perfil profissional</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {profileId ? "Atualize os seus dados." : "Complete o perfil para aparecer no diretório."}
        </p>

        <Card>
          <CardHeader><CardTitle className="text-base">Dados</CardTitle></CardHeader>
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
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Carregar Foto de Perfil / Trabalho
                  </Button>
                  <p className="text-[11px] text-muted-foreground mt-1">JPG ou PNG, máx 5MB</p>
                </div>
              </div>
              <Field label="Nome *">
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
              <div className="grid grid-cols-2 gap-3">
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
              <Field label="Preço">
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    { value: "fixo", label: "Valor fixo" },
                    { value: "negociavel", label: "Negociável" },
                    { value: "combinar", label: "A combinar" },
                  ].map((opt) => (
                    <Badge
                      key={opt.value}
                      variant={form.price_type === opt.value ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1.5 text-xs"
                      onClick={() => setForm({ ...form, price_type: opt.value, starting_price: opt.value === "fixo" ? form.starting_price : "" })}
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>
                {form.price_type === "fixo" && (
                  <Input type="number" min="0" placeholder="Valor em CFA (ex: 15000)" value={form.starting_price} onChange={(e) => setForm({ ...form, starting_price: e.target.value })} />
                )}
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

        {profileId && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Galeria de Trabalhos (Opcional)</CardTitle>
              <p className="text-xs text-muted-foreground">
                Adicione até {MAX_GALLERY} fotos dos seus trabalhos anteriores. Ajuda clientes a confiar no seu serviço.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {gallery.map((img) => (
                  <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border bg-muted group">
                    <img src={img.image_url} alt="Trabalho" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setGalleryDeleteId(img.id)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-background/90 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      aria-label="Remover foto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {gallery.length < MAX_GALLERY && (
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={galleryUploading}
                    className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary"
                  >
                    {galleryUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="h-5 w-5" />
                        <span className="text-[11px]">Adicionar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleGalleryUpload}
              />
              <p className="text-[11px] text-muted-foreground">JPG ou PNG, máx 5MB cada · {gallery.length}/{MAX_GALLERY}</p>
            </CardContent>
          </Card>
        )}

        <ConfirmDialog
          open={galleryDeleteId !== null}
          onOpenChange={(o) => { if (!o) setGalleryDeleteId(null); }}
          title="Remover foto"
          description="Remover esta foto da galeria?"
          confirmLabel="Remover"
          destructive
          onConfirm={() => {
            if (galleryDeleteId) deleteGalleryImage(galleryDeleteId);
            setGalleryDeleteId(null);
          }}
        />

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
                  Confirme a sua identidade para receber o selo de perfil verificado e ganhar a confiança dos clientes.
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
                      <Label>Selfie (foto do seu rosto)</Label>
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
              <p className="text-xs text-muted-foreground">Como os clientes interagem com o seu perfil.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Atividade recente</CardTitle>
              <p className="text-xs text-muted-foreground">Últimas visitas e contactos, em tempo real.</p>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ainda sem atividade. Quando alguém visitar o seu perfil ou entrar em contacto, aparece aqui em tempo real.
                </p>
              ) : (
                <ul className="divide-y">
                  {activity.map((a) => (
                    <li key={a.id} className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm">
                        {a.activity_type === "vista" && <Eye className="h-4 w-4 text-primary" />}
                        {a.activity_type === "whatsapp" && <MessageCircle className="h-4 w-4 text-[#25D366]" />}
                        {a.activity_type === "call" && <Phone className="h-4 w-4 text-secondary-foreground" />}
                        <span>
                          {a.activity_type === "vista" && "Vista do perfil"}
                          {a.activity_type === "whatsapp" && "Contacto via WhatsApp"}
                          {a.activity_type === "call" && "Ligação telefónica"}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString("pt-PT")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
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