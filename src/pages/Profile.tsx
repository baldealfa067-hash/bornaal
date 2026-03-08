import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { LogOut, Trash2, ImagePlus } from "lucide-react";
import { usePortfolio, useUploadPortfolioImage, useDeletePortfolioImage } from "@/hooks/usePortfolio";

const Profile = () => {
  const { user, role, signOut } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingProfile, setExistingProfile] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  const { data: portfolio = [] } = usePortfolio(profileId ?? "");
  const uploadPortfolio = useUploadPortfolioImage();
  const deletePortfolio = useDeletePortfolioImage();

  useEffect(() => {
    if (user && role === "provider") {
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setName(data.name);
            setCategory(data.category);
            setPhone(data.phone);
            setLocation(data.location);
            setDescription(data.description ?? "");
            setPhotoUrl(data.photo_url);
            setExistingProfile(true);
            setProfileId(data.id);
          }
        });
    }
  }, [user, role]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12 text-center">
        <h1 className="text-xl font-bold mb-2">Perfil</h1>
        <p className="text-muted-foreground mb-4">Faça login para ver o seu perfil.</p>
        <Link to="/auth"><Button>Entrar</Button></Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim() || !phone.trim() || !location.trim()) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let uploadedUrl = photoUrl;

      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, photoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        uploadedUrl = urlData.publicUrl;
      }

      const profileData = {
        user_id: user.id,
        name: name.trim(),
        category: category.trim(),
        phone: phone.trim(),
        location: location.trim(),
        description: description.trim() || null,
        photo_url: uploadedUrl,
      };

      if (existingProfile) {
        const { error } = await supabase.from("profiles").update(profileData).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("profiles").insert(profileData).select("id").single();
        if (error) throw error;
        setExistingProfile(true);
        setProfileId(data.id);
      }

      toast({ title: "Perfil guardado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profileId) return;
    try {
      await uploadPortfolio.mutateAsync({ providerId: profileId, userId: user.id, file });
      toast({ title: "Imagem adicionada ao portfólio!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    e.target.value = "";
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Perfil</h1>
        <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        {user.email} · <span className="capitalize font-medium text-foreground">{role}</span>
      </div>

      {role === "provider" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Perfil do Prestador</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
                </div>
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Input placeholder="Ex: Electricista, Carpinteiro..." value={category} onChange={(e) => setCategory(e.target.value)} maxLength={100} required />
                </div>
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input placeholder="+245..." value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} required />
                </div>
                <div className="space-y-2">
                  <Label>Localização *</Label>
                  <Input placeholder="Ex: Bissau" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} required />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea placeholder="Descreva os seus serviços..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
                </div>
                <div className="space-y-2">
                  <Label>Foto de perfil</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
                  {photoUrl && <img src={photoUrl} alt="Foto" className="h-16 w-16 rounded-lg object-cover mt-1" />}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "A guardar..." : existingProfile ? "Atualizar perfil" : "Criar perfil"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Portfolio section */}
          {existingProfile && profileId && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Portfólio ({portfolio.length}/6)</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {portfolio.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border bg-muted group">
                      <img src={img.image_url} alt={img.caption || "Trabalho"} className="w-full h-full object-cover" />
                      <button
                        onClick={() => deletePortfolio.mutate({ id: img.id, providerId: profileId })}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {portfolio.length < 6 && (
                    <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                      <ImagePlus className="h-6 w-6 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1">Adicionar</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePortfolioUpload} />
                    </label>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Adicione até 6 fotos dos seus trabalhos.</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Conta de cliente. Pode explorar prestadores e publicar pedidos de serviço.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Profile;
