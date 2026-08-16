import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapPin, Phone, MessageCircle, Wallet, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { useProvider } from "@/hooks/useProviders";
import { formatCFA } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const ProviderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: provider, isLoading } = useProvider(id!);
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [reviewerName, setReviewerName] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [portfolio, setPortfolio] = useState<{ id: string; image_url: string }[]>([]);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("portfolio_images")
      .select("id, image_url")
      .eq("provider_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPortfolio((data ?? []) as { id: string; image_url: string }[]));
  }, [id]);

  const submitReview = async () => {
    if (!id) return;
    if (rating < 1) {
      toast.error("Selecione uma avaliação em estrelas");
      return;
    }
    if (!reviewerName.trim()) {
      toast.error("Indique o seu nome");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      provider_id: id,
      rating,
      comment: comment.trim() || null,
      reviewer_name: reviewerName.trim(),
    } as never);
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao enviar avaliação");
      return;
    }
    toast.success(
      "Obrigado! A sua avaliação foi enviada com sucesso e será exibida no perfil assim que for validada pela nossa equipa."
    );
    setRating(0);
    setReviewerName("");
    setComment("");
    queryClient.invalidateQueries({ queryKey: ["provider", id] });
    queryClient.invalidateQueries({ queryKey: ["providers"] });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">A carregar...</div>;
  }

  if (!provider) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Prestador não encontrado.</div>;
  }

  const whatsappUrl = `https://wa.me/${provider.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Olá ${provider.name}, encontrei o seu perfil no BissauService e gostaria de saber mais sobre os seus serviços.`
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
          <h1 className="text-xl font-bold flex items-center gap-1.5">
            {provider.name}
            {(provider as { is_verified?: boolean }).is_verified && (
              <BadgeCheck className="h-5 w-5 text-primary" aria-label="Prestador verificado" />
            )}
          </h1>
          <Badge variant="secondary" className="mt-1">{provider.category}</Badge>
          {(provider as { services?: string[] }).services?.length ? (
            <div className="flex flex-wrap gap-1 mt-2">
              {(provider as { services?: string[] }).services!.map((s) => (
                <Badge key={s} variant="outline" className="text-[11px]">{s}</Badge>
              ))}
            </div>
          ) : null}
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
        {provider.starting_price != null && (
          <div className="flex items-center gap-2 text-foreground">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="font-semibold">A partir de {formatCFA(provider.starting_price)}</span>
          </div>
        )}
      </div>

      {provider.description && (
        <div className="mb-6">
          <h2 className="font-semibold mb-1">Sobre</h2>
          <p className="text-sm text-muted-foreground">{provider.description}</p>
        </div>
      )}

      {portfolio.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold mb-2">Meus Trabalhos anteriores</h2>
          <div className="grid grid-cols-2 gap-2">
            {portfolio.map((img) => (
              <a
                key={img.id}
                href={img.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square overflow-hidden rounded-lg border bg-muted"
              >
                <img src={img.image_url} alt="Trabalho do prestador" className="w-full h-full object-cover hover:scale-105 transition-transform" loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Contact buttons */}
      <div className="mb-8 grid grid-cols-2 gap-2">
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </Button>
        </a>
        <a href={`tel:${provider.phone.replace(/\s/g, "")}`} className="block">
          <Button variant="secondary" className="w-full gap-2">
            <Phone className="h-5 w-5" />
            Ligar
          </Button>
        </a>
      </div>

      <section>
        <h2 className="font-semibold mb-3">Avaliações ({provider.reviewCount})</h2>

        <div className="p-4 rounded-lg border bg-card mb-4 space-y-3">
          <p className="text-sm font-medium">Deixe a sua avaliação</p>
          <div className="flex items-center gap-2">
            <StarRating rating={rating} onChange={setRating} size="md" />
          </div>
          <Input
            placeholder="O seu nome"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
          />
          <Textarea
            placeholder="Comentário (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <Button onClick={submitReview} disabled={submitting} className="w-full">
            {submitting ? "A enviar..." : "Enviar avaliação"}
          </Button>
        </div>

        {provider.reviews && provider.reviews.length > 0 ? (
          <div className="flex flex-col gap-3">
            {provider.reviews.map((r) => (
              <div key={r.id} className="p-3 rounded-lg border bg-card">
                <StarRating rating={r.rating} />
                {(r as { reviewer_name?: string | null }).reviewer_name && (
                  <p className="text-sm font-medium mt-1">
                    {(r as { reviewer_name?: string | null }).reviewer_name}
                  </p>
                )}
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
