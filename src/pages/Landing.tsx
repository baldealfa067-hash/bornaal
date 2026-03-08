import { Link } from "react-router-dom";
import { Search, Star, MapPin, Users, ArrowRight, Zap, Shield, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useProviders, useCategories } from "@/hooks/useProviders";
import { StarRating } from "@/components/StarRating";
import heroBg from "@/assets/hero-bg.jpg";

const Landing = () => {
  const { data: providers = [] } = useProviders();
  const { data: categories = [] } = useCategories();
  const topProviders = providers
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/80 via-foreground/60 to-background" />
        <div className="relative max-w-lg mx-auto px-4 pt-16 pb-20 text-center">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Nó <span className="text-secondary">Tarbadja</span>
          </h1>
          <p className="text-white/80 text-lg mb-8 font-medium">
            A plataforma de serviços locais da Guiné-Bissau
          </p>
          <Link to="/inicio">
            <Button size="lg" className="rounded-full px-8 gap-2 text-base font-semibold shadow-lg">
              <Search className="h-4 w-4" />
              Encontrar prestadores
            </Button>
          </Link>
          <p className="text-white/50 text-xs mt-4">
            Electricistas, canalizadores, cabeleireiras e muito mais
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-lg mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: "Prestadores", value: providers.length.toString() },
            { icon: Star, label: "Categorias", value: categories.length.toString() },
            { icon: MapPin, label: "Cidades", value: "3+" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl p-4 text-center shadow-md border border-border/50">
              <stat.icon className="h-5 w-5 mx-auto text-primary mb-1.5" />
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-lg mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-foreground mb-6 text-center">Como funciona</h2>
        <div className="flex flex-col gap-4">
          {[
            { icon: Search, title: "Pesquise", desc: "Encontre o profissional certo por categoria ou localização" },
            { icon: MessageSquare, title: "Contacte", desc: "Ligue ou envie mensagem diretamente ao prestador" },
            { icon: Star, title: "Avalie", desc: "Deixe a sua avaliação para ajudar a comunidade" },
          ].map((step, i) => (
            <div key={step.title} className="flex gap-4 items-start">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  <span className="text-primary mr-1">{i + 1}.</span>
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Providers */}
      {topProviders.length > 0 && (
        <section className="max-w-lg mx-auto px-4 pb-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">Melhores prestadores</h2>
            <Link to="/inicio" className="text-sm text-primary flex items-center gap-1">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {topProviders.map((p) => (
              <Link key={p.id} to={`/prestador/${p.id}`} className="block">
                <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4 text-center">
                    <Avatar className="h-16 w-16 mx-auto mb-2">
                      {p.photo_url && <AvatarImage src={p.photo_url} alt={p.name} className="object-cover" />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                        {p.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-foreground text-sm truncate">{p.name}</h3>
                    <Badge variant="secondary" className="text-[10px] mt-1">{p.category}</Badge>
                    <div className="flex items-center justify-center gap-1 mt-1.5">
                      <StarRating rating={Math.round(p.avgRating)} />
                      <span className="text-[10px] text-muted-foreground">({p.reviewCount})</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section className="max-w-lg mx-auto px-4 pb-12">
          <h2 className="text-xl font-bold text-foreground mb-4 text-center">Categorias disponíveis</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <Link key={cat} to={`/explorar?categoria=${encodeURIComponent(cat)}`}>
                <Badge
                  variant="outline"
                  className="px-4 py-2 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {cat}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-lg mx-auto px-4 pb-12">
        <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
          <h2 className="text-lg font-bold text-foreground mb-4 text-center">Porquê Nó Tarbadja?</h2>
          <div className="flex flex-col gap-3">
            {[
              { icon: Zap, text: "Rápido e fácil de usar" },
              { icon: Shield, text: "Avaliações verificadas pela comunidade" },
              { icon: MapPin, text: "Focado na Guiné-Bissau" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <f.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm text-foreground">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-lg mx-auto px-4 pb-16 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">É prestador de serviços?</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Registe-se e alcance mais clientes na sua zona
        </p>
        <Link to="/auth">
          <Button variant="outline" className="rounded-full px-6 gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            Criar conta grátis <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">
          © 2026 Nó Tarbadja — Serviços locais na Guiné-Bissau
        </p>
      </footer>
    </div>
  );
};

export default Landing;
