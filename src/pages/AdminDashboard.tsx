import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatCFA } from "@/lib/format";

type Provider = { id: string; name: string; category: string; phone: string; location: string; starting_price: number | null };
type Request = { id: string; requester_name: string | null; category: string; location: string; description: string; status: string; created_at: string };
type Review = { id: string; provider_id: string; reviewer_name: string | null; rating: number; comment: string | null; created_at: string };

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) return navigate("/login", { replace: true });
    loadAll();
  }, [user, isAdmin, loading, navigate]);

  const loadAll = async () => {
    const [{ data: p }, { data: r }, { data: rv }] = await Promise.all([
      supabase.from("profiles").select("id, name, category, phone, location, starting_price").order("name"),
      supabase.from("service_requests").select("id, requester_name, category, location, description, status, created_at").order("created_at", { ascending: false }),
      supabase.from("reviews").select("id, provider_id, reviewer_name, rating, comment, created_at").order("created_at", { ascending: false }),
    ]);
    setProviders((p ?? []) as Provider[]);
    setRequests((r ?? []) as Request[]);
    setReviews((rv ?? []) as Review[]);
  };

  const remove = async (table: "profiles" | "service_requests" | "reviews", id: string) => {
    if (!confirm("Tem a certeza que pretende eliminar?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado");
    loadAll();
  };

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
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="providers">Prestadores ({providers.length})</TabsTrigger>
            <TabsTrigger value="requests">Pedidos ({requests.length})</TabsTrigger>
            <TabsTrigger value="reviews">Avaliações ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="flex flex-col gap-2">
            {providers.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/prestador/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.category} · {p.location} · {p.phone}
                      {p.starting_price != null && ` · desde ${formatCFA(p.starting_price)}`}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove("profiles", p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
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

          <TabsContent value="reviews" className="flex flex-col gap-2">
            {reviews.map((r) => (
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
            {!reviews.length && <p className="text-sm text-muted-foreground text-center py-6">Sem avaliações.</p>}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;