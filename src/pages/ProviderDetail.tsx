import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Phone, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { useProvider } from "@/hooks/useProviders";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useSendMessage } from "@/hooks/useMessages";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const ProviderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: provider, isLoading } = useProvider(id!);
  const { data: portfolio = [] } = usePortfolio(id!);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sendMessage = useSendMessage();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [showMsgInput, setShowMsgInput] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">A carregar...</div>;
  }

  if (!provider) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Prestador não encontrado.</div>;
  }

  const whatsappUrl = `https://wa.me/${provider.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Olá ${provider.name}, encontrei o seu perfil no Nó Tarbadja e gostaria de saber mais sobre os seus serviços.`
  )}`;

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Faça login para avaliar", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        user_id: user.id,
        provider_id: provider.id,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      toast({ title: "Avaliação enviada!" });
      setComment("");
      setRating(5);
      queryClient.invalidateQueries({ queryKey: ["provider", id] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMsg = () => {
    if (!user || !msgText.trim() || !provider.user_id) return;
    sendMessage.mutate(
      { senderId: user.id, receiverId: provider.user_id, content: msgText.trim() },
      {
        onSuccess: () => {
          toast({ title: "Mensagem enviada!" });
          setMsgText("");
          setShowMsgInput(false);
          navigate("/mensagens");
        },
        onError: (err: any) => {
          toast({ title: "Erro", description: err.message, variant: "destructive" });
        },
      }
    );
  };

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

      {/* Portfolio Gallery */}
      {portfolio.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold mb-3">Portfólio</h2>
          <div className="grid grid-cols-3 gap-2">
            {portfolio.map((img) => (
              <button
                key={img.id}
                onClick={() => setLightboxImg(img.image_url)}
                className="aspect-square rounded-lg overflow-hidden border bg-muted"
              >
                <img src={img.image_url} alt={img.caption || "Trabalho"} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightboxImg} onOpenChange={() => setLightboxImg(null)}>
        <DialogContent className="max-w-lg p-2">
          {lightboxImg && <img src={lightboxImg} alt="Portfólio" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Contact buttons */}
      <div className="flex gap-2 mb-8">
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </Button>
        </a>
        {user && user.id !== provider.user_id && (
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => setShowMsgInput(!showMsgInput)}
          >
            <Send className="h-4 w-4" />
            Mensagem
          </Button>
        )}
      </div>

      {/* Quick message input */}
      {showMsgInput && user && (
        <div className="mb-8 p-4 rounded-lg border bg-card space-y-3">
          <Textarea
            placeholder="Escreva a sua mensagem..."
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            maxLength={500}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSendMsg} disabled={!msgText.trim() || sendMessage.isPending}>
              {sendMessage.isPending ? "A enviar..." : "Enviar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowMsgInput(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <section>
        <h2 className="font-semibold mb-3">Avaliações ({provider.reviewCount})</h2>

        {provider.reviews && provider.reviews.length > 0 ? (
          <div className="flex flex-col gap-3 mb-6">
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
          <p className="text-sm text-muted-foreground mb-6">Ainda sem avaliações.</p>
        )}

        {user && (
          <form onSubmit={handleReview} className="space-y-3 border rounded-lg p-4 bg-card">
            <h3 className="font-medium text-sm">Deixe a sua avaliação</h3>
            <StarRating rating={rating} onChange={setRating} size="md" />
            <Textarea
              placeholder="Comentário (opcional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
            />
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "A enviar..." : "Enviar avaliação"}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
};

export default ProviderDetail;
