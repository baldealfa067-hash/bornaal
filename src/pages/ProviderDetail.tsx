import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, MapPin, Phone, MessageCircle, Wallet, BadgeCheck, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { useProvider } from "@/hooks/useProviders";
import { formatCFA } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const REPORT_REASONS = [
  "Serviço não foi realizado",
  "Cobrança indevida",
  "Comportamento inadequado",
  "Perfil falso/enganoso",
  "Outro",
] as const;

const ProviderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: provider, isLoading } = useProvider(id!);
  const [portfolio, setPortfolio] = useState<{ id: string; image_url: string }[]>([]);
  const viewLogged = useRef(false);
  const [complaining, setComplaining] = useState(false);
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportStep, setReportStep] = useState<"form" | "success">("form");
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");

  useEffect(() => {
    if (!id) return;
    if (!viewLogged.current) {
      viewLogged.current = true;
      supabase.rpc("increment_provider_view", { p_provider_id: id }).then(({ error }) => {
        if (error) console.error("[stats] increment_provider_view error:", error.message);
      });
    }
    supabase
      .from("portfolio_images")
      .select("id, image_url")
      .eq("provider_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPortfolio((data ?? []) as { id: string; image_url: string }[]));
  }, [id]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">A carregar...</div>;
  }

  if (!provider) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Prestador não encontrado.</div>;
  }

  const whatsappUrl = `https://wa.me/${provider.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Olá ${provider.name}, encontrei o seu perfil no Bornaal e gostaria de saber mais sobre os seus serviços.`
  )}`;

  const trackWhatsapp = () => {
    if (!id) return;
    supabase.rpc("record_provider_contact", { p_provider_id: id, contact_type: "whatsapp" }).then(({ error }) => {
      if (error) console.error("[stats] record whatsapp error:", error.message);
    });
  };

  const trackCall = () => {
    if (!id) return;
    supabase.rpc("record_provider_contact", { p_provider_id: id, contact_type: "call" }).then(({ error }) => {
      if (error) console.error("[stats] record call error:", error.message);
    });
  };

  const openReport = () => {
    setReportReason("");
    setReportDescription("");
    setReportStep("form");
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!id) return;
    if (!reportReason.trim() || !reportDescription.trim()) {
      toast.error("Escolhe um motivo e escreve uma descrição.");
      return;
    }
    setComplaining(true);
    try {
      const { error } = await supabase.from("complaints").insert({
        provider_id: id,
        client_id: user?.id ?? null,
        reason: reportReason.trim(),
        description: reportDescription.trim(),
        status: "pendente",
      });
      if (error) {
        console.error("[complaints] error:", error.message);
        toast.error("Erro ao enviar a denúncia. Tenta novamente.");
      } else {
        setReportStep("success");
      }
    } catch (e) {
      console.error("[complaints] exception:", e);
      toast.error("Erro ao enviar a denúncia. Tenta novamente.");
    } finally {
      setComplaining(false);
    }
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
        {provider.price_type === "fixo" && provider.starting_price != null && (
          <div className="flex items-center gap-2 text-foreground">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="font-semibold">{formatCFA(provider.starting_price)}</span>
          </div>
        )}
        {provider.price_type === "negociavel" && (
          <div className="flex items-center gap-2 text-foreground">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="font-semibold">Negociável</span>
          </div>
        )}
        {provider.price_type === "combinar" && (
          <div className="flex items-center gap-2 text-foreground">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="font-semibold">A combinar</span>
          </div>
        )}
        {/* Botão de denunciar (qualquer visitante) */}
        {provider.id !== user?.id && (
          <Button variant="outline" className="w-full gap-2" onClick={openReport}>
            <AlertCircle className="h-5 w-5" />
            Denunciar
          </Button>
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
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block" onClick={trackWhatsapp}>
          <Button className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </Button>
        </a>
        <a href={`tel:${provider.phone.replace(/\s/g, "")}`} className="block" onClick={trackCall}>
          <Button variant="secondary" className="w-full gap-2">
            <Phone className="h-5 w-5" />
            Ligar
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

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          {reportStep === "form" && (
            <>
              <DialogHeader>
                <DialogTitle>Denunciar {provider.name}</DialogTitle>
                <DialogDescription>
                  As denúncias são analisadas pela nossa equipa antes de qualquer ação. O prestador não vê esta denúncia.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="report-reason">Motivo</Label>
                  <Select value={reportReason} onValueChange={setReportReason}>
                    <SelectTrigger id="report-reason">
                      <SelectValue placeholder="Seleciona o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_REASONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="report-description">Descrição</Label>
                  <Textarea
                    id="report-description"
                    placeholder="Explica o que aconteceu (obrigatório)"
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReportOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={submitReport}
                  disabled={complaining || !reportReason || !reportDescription.trim()}
                  className="gap-2"
                >
                  <ShieldAlert className="h-4 w-4" />
                  {complaining ? "A enviar..." : "Submeter denúncia"}
                </Button>
              </DialogFooter>
            </>
          )}

          {reportStep === "success" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Denúncia enviada
                </DialogTitle>
                <DialogDescription>
                  A tua denúncia foi enviada e será analisada pela nossa equipa.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setReportOpen(false)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderDetail;
