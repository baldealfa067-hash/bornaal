import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const Publish = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12 text-center">
        <h1 className="text-xl font-bold mb-2">Publicar Pedido</h1>
        <p className="text-muted-foreground mb-4">Faça login para publicar um pedido de serviço.</p>
        <Link to="/auth">
          <Button>Entrar</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim() || !description.trim() || !location.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("service_requests").insert({
        user_id: user.id,
        category: category.trim(),
        description: description.trim(),
        location: location.trim(),
      });
      if (error) throw error;
      toast({ title: "Pedido publicado com sucesso!" });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <Card>
        <CardHeader>
          <CardTitle>Publicar Pedido de Serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input
                placeholder="Ex: Canalização, Electricidade..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o serviço que precisa..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input
                placeholder="Ex: Bissau, Bairro Militar"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "A publicar..." : "Publicar pedido"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Publish;
