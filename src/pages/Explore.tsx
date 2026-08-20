import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Loader2, Wrench, Store, ChevronRight } from "lucide-react";
import { ProviderCard } from "@/components/ProviderCard";
import { Pagination } from "@/components/Pagination";
import { useProviders, useCategories, useBusinessCategories } from "@/hooks/useProviders";
import { useBairros } from "@/hooks/useBairros";
import { BAIRROS_FILTER } from "@/lib/locations";
import { getPageCount, paginateArray } from "@/lib/pagination";

const PAGE_SIZE = 10;

const SECTIONS = [
  {
    key: "servicos",
    label: "Prestadores de Serviço",
    short: "Prestadores",
    icon: Wrench,
    desc: "Eletricistas, costureiras, pedreiros, enfermeiros...",
  },
  {
    key: "lojas",
    label: "Restaurantes / Lojas",
    short: "Restaurantes",
    icon: Store,
    desc: "Restaurantes, padarias, mercearias, lojas...",
  },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = (searchParams.get("tipo") as SectionKey) || "";
  const activeCategory = searchParams.get("categoria") || "";
  const qParam = searchParams.get("q") || "";
  const [search, setSearch] = useState(qParam);
  const [location, setLocation] = useState(BAIRROS_FILTER[0]);
  const [page, setPage] = useState(1);

  const { data: providers = [], isLoading: loadingProviders, error: providersError } = useProviders(
    section === "lojas" ? "business" : "provider"
  );
  const { data: serviceCategories = [] } = useCategories();
  const { data: businessCategories = [] } = useBusinessCategories();
  const { data: bairros = [] } = useBairros();
  const bairroOptions = bairros.length ? ["Todos os Bairros", ...bairros] : BAIRROS_FILTER;

  const categories = section === "lojas" ? businessCategories : serviceCategories;

  // Sync q param to search state on mount
  useEffect(() => {
    if (qParam) setSearch(qParam);
  }, [qParam]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, location, activeCategory, section]);

  const goSection = (key: SectionKey) => {
    setSearchParams(key ? { tipo: key } : {});
  };

  const setCategory = (cat: string) => {
    const params: Record<string, string> = { tipo: section };
    if (cat) params.categoria = cat;
    if (search) params.q = search;
    setSearchParams(params);
  };

  // Entry screen: choose between the two main sections
  if (!section) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-8">
        <h1 className="text-2xl font-bold mb-1">Explorar</h1>
        <p className="text-sm text-muted-foreground mb-6">O que procuras hoje?</p>
        <div className="flex flex-col gap-3">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => goSection(s.key)}
              className="flex items-center gap-4 rounded-2xl border bg-card p-5 text-left hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <s.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-base">{s.label}</div>
                <div className="text-xs text-muted-foreground truncate">{s.desc}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const current = SECTIONS.find((s) => s.key === section)!;

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

  const pageCount = getPageCount(filtered.length, PAGE_SIZE);
  const paginated = paginateArray(filtered, page, PAGE_SIZE);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">{current.label}</h1>
        <Button variant="outline" size="sm" onClick={() => goSection("")}>
          Alterar secção
        </Button>
      </div>

      {/* Section switcher */}
      <div className="flex gap-1.5 rounded-full bg-muted p-1 mb-3">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => goSection(s.key)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              section === s.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.short}
          </button>
        ))}
      </div>

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
            {bairroOptions.map((loc) => (
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
            onClick={() => setCategory("")}
          >
            Todas
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              className="cursor-pointer px-3 py-1"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      )}

      {loadingProviders ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : providersError ? (
        <p className="text-center text-destructive py-12 text-sm">Erro ao carregar.</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">
          Nenhum resultado encontrado nesta secção.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {paginated.map((p) => (
              <ProviderCard key={p.id} {...p} />
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} total={filtered.length} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default Explore;