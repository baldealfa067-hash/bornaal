import { useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { useProvider } from "@/hooks/useProviders";

const ProviderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: provider, isLoading } = useProvider(id!);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">A carregar...</div>;
  }

  if (!provider) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Prestador não encontrado.</div>;
  }

  const whatsappUrl = `https://wa.me/${provider.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Olá ${provider.name}, encontrei o seu perfil no Nó Tarbadja e gostaria de saber mais sobre os seus serviços.`
  )}`;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-start gap-4 mb-6">
        <Avatar className="h-20 w-20 rounded-xl">
          {provider.photo_url ? (
            <AvatarImage src={provider.photo_url} alt={provider.name} className="object-cover" />
          ) : null}
          <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-2xl font-bold">
            {provider.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{provider.name}</h1>
          <Badge variant="secondary" className="mt-1">{provider.category}</Badge>
          <div className="flex items-center gap-2 mt-2">
            <StarRating rating={Math.round(provider.avgRating)} size="md" />
            <span className="text-sm text-muted-foreground">
              {provider.avgRating.toFixed(1)} ({provider.reviewCount})
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-6 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{provider.location}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>{provider.phone}</span>
        </div>
      </div>

      {provider.description && (
        <div className="mb-6">
          <h2 className="font-semibold mb-1">Sobre</h2>
          <p className="text-sm text-muted-foreground">{provider.description}</p>
        </div>
      )}

      {/* Contact button */}
      <div className="mb-8">
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <MessageCircle className="h-5 w-5" />
            Contactar via WhatsApp
          </Button>
        </a>
      </div>

      <section>
        <h2 className="font-semibold mb-3">Avaliações ({provider.reviewCount})</h2>

        {provider.reviews && provider.reviews.length > 0 ? (
          <div className="flex flex-col gap-3">
            {provider.reviews.map((r) => (
              <div key={r.id} className="p-3 rounded-lg border bg-card">
                <StarRating rating={r.rating} />
                {r.comment && <p className="text-sm mt-1">{r.comment}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">
                  {new Date(r.created_at).toLocaleDateString("pt")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Ainda sem avaliações.</p>
        )}
      </section>
    </div>
  );
};

export default ProviderDetail;
