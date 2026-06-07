import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin } from "lucide-react";
import { ProviderCard } from "@/components/ProviderCard";
import { useProviders, useCategories } from "@/hooks/useProviders";
import { BAIRROS_FILTER } from "@/lib/locations";

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("categoria") || "";
  const qParam = searchParams.get("q") || "";
  const [search, setSearch] = useState(qParam);
  const [location, setLocation] = useState(BAIRROS_FILTER[0]);
  const { data: providers = [] } = useProviders();
  const { data: categories = [] } = useCategories();

  // Sync q param to search state on mount
  useEffect(() => {
    if (qParam) setSearch(qParam);
  }, [qParam]);

  const filtered = providers.filter((p) => {
    const matchCat = !activeCategory || p.category === activeCategory;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchLocation =
      location === BAIRROS_FILTER[0] ||
      p.location.toLowerCase().includes(location.toLowerCase());
    return matchCat && matchSearch && matchLocation;
  });

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold mb-4">Explorar Prestadores</h1>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome, categoria ou localização..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {/* Location filter */}
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="h-9 text-sm bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BAIRROS_FILTER.map((loc) => (
              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <Badge
            variant={!activeCategory ? "default" : "outline"}
            className="cursor-pointer px-3 py-1"
            onClick={() => setSearchParams(search ? { q: search } : {})}
          >
            Todos
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              className="cursor-pointer px-3 py-1"
              onClick={() => setSearchParams({ categoria: cat, ...(search ? { q: search } : {}) })}
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
