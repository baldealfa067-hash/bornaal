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
import { LogOut } from "lucide-react";

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
          }
        });
    }
  }, [user, role]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12 text-center">
        <h1 className="text-xl font-bold mb-2">Perfil</h1>
        <p className="text-muted-foreground mb-4">Faça login para ver o seu perfil.</p>
        <Link to="/auth">
          <Button>Entrar</Button>
        </Link>
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
        const { error } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert(profileData);
        if (error) throw error;
        setExistingProfile(true);
      }

      toast({ title: "Perfil guardado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Perfil do Prestador</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Input
                  placeholder="Ex: Electricista, Carpinteiro..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input
                  placeholder="+245..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Localização *</Label>
                <Input
                  placeholder="Ex: Bissau"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={200}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva os seus serviços..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                />
              </div>
              <div className="space-y-2">
                <Label>Foto</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
                {photoUrl && (
                  <img src={photoUrl} alt="Foto" className="h-16 w-16 rounded-lg object-cover mt-1" />
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "A guardar..." : existingProfile ? "Atualizar perfil" : "Criar perfil"}
              </Button>
            </form>
          </CardContent>
        </Card>
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
