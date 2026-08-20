import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProviderCard } from "@/components/ProviderCard";
import { useProviders, useCategories, useBusinessCategories } from "@/hooks/useProviders";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { NotificationBell } from "@/components/NotificationBell";

const Index = () => {
  const [search, setSearch] = useState("");
  const { data: providers = [], isLoading: loadingProviders, error: providersError } = useProviders("provider");
  const { data: businesses = [], isLoading: loadingBusinesses, error: businessesError } = useProviders("business");
  const { data: categories = [] } = useCategories();
  const { data: businessCategories = [] } = useBusinessCategories();
  const { data: requests = [], isLoading: loadingRequests } = useQuery({
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

  const matchSearch = (p: { name: string; category: string }) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase());

  const filteredProviders = search ? providers.filter(matchSearch) : providers.slice(0, 6);
  const filteredBusinesses = search ? businesses.filter(matchSearch) : businesses.slice(0, 6);

  return (
    <div className="max-w-lg mx-auto px-4">
      {/* Header */}
      <div className="pt-8 pb-5 flex items-center justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-3">
            <img src={logo} alt="Bornaal" className="h-14 md:h-16 w-auto" />
          </Link>
          <p className="text-sm text-muted-foreground mt-2">
            Encontre serviços locais na Guiné-Bissau
          </p>
        </div>
        <NotificationBell />
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
      {!search && (categories.length > 0 || businessCategories.length > 0) && (
        <section className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Categorias</h2>
            <Link to="/explorar" className="text-sm text-primary flex items-center gap-1">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {categories.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Serviços</p>
              <div className="flex gap-2 flex-wrap">
                {categories.slice(0, 8).map((cat) => (
                  <Link key={cat} to={`/explorar?tipo=servicos&categoria=${encodeURIComponent(cat)}`}>
                    <Badge variant="outline" className="px-3 py-1.5 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                      {cat}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {businessCategories.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Restaurantes / Lojas</p>
              <div className="flex gap-2 flex-wrap">
                {businessCategories.slice(0, 8).map((cat) => (
                  <Link key={cat} to={`/explorar?tipo=lojas&categoria=${encodeURIComponent(cat)}`}>
                    <Badge variant="outline" className="px-3 py-1.5 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                      {cat}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Service providers */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">
          {search ? "Resultados — Prestadores" : "Prestadores em destaque"}
        </h2>
        {loadingProviders ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : providersError ? (
          <p className="text-sm text-destructive py-8 text-center">Erro ao carregar prestadores.</p>
        ) : filteredProviders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {search ? "Nenhum prestador encontrado." : "Ainda não há prestadores registados."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredProviders.map((p) => (
              <ProviderCard key={p.id} {...p} />
            ))}
          </div>
        )}
      </section>

      {/* Restaurants / Stores */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">
          {search ? "Resultados — Restaurantes / Lojas" : "Restaurantes / Lojas em destaque"}
        </h2>
        {loadingBusinesses ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : businessesError ? (
          <p className="text-sm text-destructive py-8 text-center">Erro ao carregar restaurantes.</p>
        ) : filteredBusinesses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {search ? "Nenhum restaurante ou loja encontrado." : "Ainda não há restaurantes ou lojas registados."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredBusinesses.map((b) => (
              <ProviderCard key={b.id} {...b} />
            ))}
          </div>
        )}
      </section>

      {/* Recent requests */}
      {!search && loadingRequests && (
        <div className="flex justify-center py-4 mb-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!search && !loadingRequests && requests.length > 0 && (
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