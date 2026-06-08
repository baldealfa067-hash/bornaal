import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, ArrowLeft, Trash2, BadgeCheck, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatCFA } from "@/lib/format";

type Provider = { id: string; name: string; category: string; phone: string; location: string; starting_price: number | null; is_verified: boolean };
type Request = { id: string; requester_name: string | null; category: string; location: string; description: string; status: string; created_at: string };
type Review = { id: string; provider_id: string; reviewer_name: string | null; rating: number; comment: string | null; created_at: string; status: string };
type Category = { id: string; name: string };

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) return navigate("/login", { replace: true });
    loadAll();
  }, [user, isAdmin, loading, navigate]);

  const loadAll = async () => {
    const [{ data: p }, { data: r }, { data: rv }, { data: c }] = await Promise.all([
      supabase.from("profiles").select("id, name, category, phone, location, starting_price, is_verified").order("name"),
      supabase.from("service_requests").select("id, requester_name, category, location, description, status, created_at").order("created_at", { ascending: false }),
      supabase.from("reviews").select("id, provider_id, reviewer_name, rating, comment, created_at, status").order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name").order("name"),
    ]);
    setProviders((p ?? []) as Provider[]);
    setRequests((r ?? []) as Request[]);
    setReviews((rv ?? []) as Review[]);
    setCategories((c ?? []) as Category[]);
  };

  const remove = async (table: "profiles" | "service_requests" | "reviews", id: string) => {
    if (!confirm("Tem a certeza que pretende eliminar?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado");
    loadAll();
  };

  const toggleVerified = async (p: Provider) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !p.is_verified }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(!p.is_verified ? "Marcado como verificado" : "Verificação removida");
    loadAll();
  };

  const approveReview = async (id: string) => {
    const { error } = await supabase.from("reviews").update({ status: "aprovado" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Avaliação aprovada");
    loadAll();
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    const { error } = await supabase.from("categories").insert({ name });
    if (error) return toast.error(error.message);
    setNewCategory("");
    toast.success("Categoria adicionada");
    loadAll();
  };

  const removeCategory = async (id: string) => {
    if (!confirm("Eliminar esta categoria?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Categoria eliminada");
    loadAll();
  };

  const providerName = (pid: string) => providers.find((p) => p.id === pid)?.name ?? "Prestador";
  const pendingReviews = reviews.filter((r) => r.status === "pendente");
  const approvedReviews = reviews.filter((r) => r.status === "aprovado");

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">A carregar...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Início
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Administrador</Badge>
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate("/"))} className="gap-1">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Painel de administração</h1>
        <Tabs defaultValue="providers">
          <TabsList className="grid grid-cols-5 w-full mb-4">
            <TabsTrigger value="providers">Prestadores ({providers.length})</TabsTrigger>
            <TabsTrigger value="requests">Pedidos ({requests.length})</TabsTrigger>
            <TabsTrigger value="pending">Pendentes ({pendingReviews.length})</TabsTrigger>
            <TabsTrigger value="reviews">Aprovadas ({approvedReviews.length})</TabsTrigger>
            <TabsTrigger value="categories">Categorias ({categories.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="flex flex-col gap-2">
            {providers.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/prestador/${p.id}`} className="font-semibold hover:underline inline-flex items-center gap-1">
                      {p.name}
                      {p.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                    </Link>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.category} · {p.location} · {p.phone}
                      {p.starting_price != null && ` · desde ${formatCFA(p.starting_price)}`}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant={p.is_verified ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleVerified(p)}
                      className="gap-1"
                    >
                      <BadgeCheck className="h-3 w-3" />
                      {p.is_verified ? "Verificado" : "Verificar"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove("profiles", p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!providers.length && <p className="text-sm text-muted-foreground text-center py-6">Sem prestadores.</p>}
          </TabsContent>

          <TabsContent value="requests" className="flex flex-col gap-2">
            {requests.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold">{r.requester_name ?? "Cliente"}</div>
                    <div className="text-xs text-muted-foreground mb-1">{r.category} · {r.location}</div>
                    <p className="text-sm">{r.description}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove("service_requests", r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {!requests.length && <p className="text-sm text-muted-foreground text-center py-6">Sem pedidos.</p>}
          </TabsContent>

          <TabsContent value="pending" className="flex flex-col gap-2">
            {pendingReviews.map((r) => (
              <Card key={r.id} className="border-yellow-500/40">
                <CardContent className="p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">Prestador:</div>
                    <Link to={`/prestador/${r.provider_id}`} className="font-semibold hover:underline text-sm">
                      {providerName(r.provider_id)}
                    </Link>
                    <div className="text-sm mt-1">
                      <span className="font-medium">{r.reviewer_name ?? "Anónimo"}</span> · {r.rating}★
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" onClick={() => approveReview(r.id)} className="gap-1 bg-green-600 hover:bg-green-700 text-white">
                      <Check className="h-3.5 w-3.5" /> Aprovar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => remove("reviews", r.id)} className="gap-1">
                      <X className="h-3.5 w-3.5" /> Rejeitar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!pendingReviews.length && <p className="text-sm text-muted-foreground text-center py-6">Sem avaliações pendentes.</p>}
          </TabsContent>

          <TabsContent value="reviews" className="flex flex-col gap-2">
            {approvedReviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{r.reviewer_name ?? "Anónimo"} · {r.rating}★</div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                    <Link to={`/prestador/${r.provider_id}`} className="text-xs text-primary hover:underline">Ver prestador</Link>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove("reviews", r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {!approvedReviews.length && <p className="text-sm text-muted-foreground text-center py-6">Sem avaliações aprovadas.</p>}
          </TabsContent>

          <TabsContent value="categories" className="flex flex-col gap-2">
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Nova categoria (ex: Jardinagem)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
              />
              <Button onClick={addCategory} className="gap-1 shrink-0">
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
            {categories.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{c.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeCategory(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {!categories.length && <p className="text-sm text-muted-foreground text-center py-6">Sem categorias.</p>}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;