import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProviderCard } from "@/components/ProviderCard";
import { useProviders, useCategories } from "@/hooks/useProviders";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const Index = () => {
  const [search, setSearch] = useState("");
  const { data: providers = [] } = useProviders();
  const { data: categories = [] } = useCategories();
  const { data: requests = [] } = useQuery({
    queryKey: ["recent-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const filtered = search
    ? providers.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase())
      )
    : providers.slice(0, 6);

  return (
    <div className="max-w-lg mx-auto px-4">
      {/* Header */}
      <div className="pt-8 pb-5">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src={logo} alt="BissauService" className="h-14 md:h-16 w-auto" />
        </Link>
        <p className="text-sm text-muted-foreground mt-2">
          Encontre serviços locais na Guiné-Bissau
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar prestadores ou categorias..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {/* Categories */}
      {!search && categories.length > 0 && (
        <section className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Categorias</h2>
            <Link to="/explorar" className="text-sm text-primary flex items-center gap-1">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.slice(0, 8).map((cat) => (
              <Link key={cat} to={`/explorar?categoria=${encodeURIComponent(cat)}`}>
                <Badge variant="outline" className="px-3 py-1.5 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                  {cat}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Providers */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">
          {search ? "Resultados" : "Prestadores em destaque"}
        </h2>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {search ? "Nenhum resultado encontrado." : "Ainda não há prestadores registados."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((p) => (
              <ProviderCard key={p.id} {...p} />
            ))}
          </div>
        )}
      </section>

      {/* Recent requests */}
      {!search && requests.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Pedidos recentes</h2>
          <div className="flex flex-col gap-2">
            {requests.map((r) => (
              <div key={r.id} className="p-3 rounded-lg border bg-card">
                <div className="flex justify-between items-start">
                  <Badge variant="secondary" className="text-xs">{r.category}</Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt")}
                  </span>
                </div>
                <p className="text-sm mt-1.5 text-foreground line-clamp-2">{r.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{r.location}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
