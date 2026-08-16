import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, ArrowLeft, Upload, Loader2, Trash2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { LOCATION_OPTIONS } from "@/lib/locations";
import { useCategories } from "@/hooks/useProviders";
import { useBairros } from "@/hooks/useBairros";

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [gallery, setGallery] = useState<{ id: string; image_url: string }[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const MAX_GALLERY = 4;
  const { data: categories = [] } = useCategories();
  const { data: bairros = [] } = useBairros();
  const locationOptions = bairros.length ? bairros : LOCATION_OPTIONS;

  const loadGallery = async (pid: string) => {
    const { data } = await supabase
      .from("portfolio_images")
      .select("id, image_url")
      .eq("provider_id", pid)
      .order("created_at", { ascending: false });
    setGallery((data ?? []) as { id: string; image_url: string }[]);
  };

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
        loadGallery(data.id);
      }
      setFetching(false);
    })();
  }, [user, isProvider, isAdmin, loading, navigate]);

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
    if (!confirm("Remover esta foto da galeria?")) return;
    const { error } = await supabase.from("portfolio_images").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Foto removida");
    if (profileId) loadGallery(profileId);
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
              <Field label="Preço inicial (CFA)">
                <Input type="number" min="0" placeholder="ex: 10000" value={form.starting_price} onChange={(e) => setForm({ ...form, starting_price: e.target.value })} />
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
                      onClick={() => deleteGalleryImage(img.id)}
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