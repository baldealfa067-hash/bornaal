import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { ProviderCard } from "@/components/ProviderCard";
import { useProviders, useCategories } from "@/hooks/useProviders";

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("categoria") || "";
  const [search, setSearch] = useState("");
  const { data: providers = [] } = useProviders();
  const { data: categories = [] } = useCategories();

  const filtered = providers.filter((p) => {
    const matchCat = !activeCategory || p.category === activeCategory;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold mb-4">Explorar Prestadores</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome ou localização..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <Badge
            variant={!activeCategory ? "default" : "outline"}
            className="cursor-pointer px-3 py-1"
            onClick={() => setSearchParams({})}
          >
            Todos
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              className="cursor-pointer px-3 py-1"
              onClick={() => setSearchParams({ categoria: cat })}
            >
              {cat}
            </Badge>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">
          Nenhum prestador encontrado.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((p) => (
            <ProviderCard key={p.id} {...p} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Explore;
