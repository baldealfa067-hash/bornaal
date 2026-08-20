import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, MapPin, Phone, MessageCircle, BadgeCheck, CheckCircle2, ShieldAlert, Store, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { formatCFA } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const REPORT_REASONS = [
  "Comida/produto não corresponde ao anunciado",
  "Cobrança indevida",
  "Comportamento inadequado",
  "Perfil falso/enganoso",
  "Condições de higiene",
  "Outro",
] as const;

const CONSUMPTION_LABELS: Record<string, string> = {
  comer_no_local: "Comer no local",
  para_levar: "Para levar",
  entrega: "Entrega",
};

type MenuCategory = { id: string; name: string };
type MenuItem = { id: string; name: string; price: number; photo_url: string | null; category_id: string | null };
type Review = { id: string; rating: number; comment: string | null; created_at: string; reviewer_name: string | null };

const BusinessDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Record<string, unknown> | null>(null);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const viewLogged = useRef(false);
  const [complaining, setComplaining] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportStep, setReportStep] = useState<"form" | "success">("form");
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportContact, setReportContact] = useState("");

  useEffect(() => {
    if (!id) return;
    if (!viewLogged.current) {
      viewLogged.current = true;
      supabase.rpc("increment_provider_view", { p_provider_id: id }).then(({ error }) => {
        if (error) console.error("[stats] increment_provider_view error:", error.message);
      });
    }
    (async () => {
      const [{ data: profile }, { data: cats }, { data: items }, { data: revs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("menu_categories").select("id, name").eq("business_id", id).order("name"),
        supabase.from("menu_items").select("id, name, price, photo_url, category_id").eq("business_id", id).order("name"),
        supabase.from("reviews").select("id, rating, comment, created_at, reviewer_name").eq("provider_id", id).eq("status", "aprovado").order("created_at", { ascending: false }),
      ]);
      setBusiness(profile as Record<string, unknown> | null);
      setMenuCategories((cats ?? []) as MenuCategory[]);
      setMenuItems((items ?? []) as MenuItem[]);
      setReviews((revs ?? []) as Review[]);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">A carregar...</div>;
  }

  if (!business || business.profile_type !== "business") {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Estabelecimento não encontrado.</div>;
  }

  const name = String(business.name ?? "");
  const phone = String(business.phone ?? "");
  const category = String(business.category ?? "");
  const location = String(business.location ?? "");
  const description = (business.description as string | null) ?? null;
  const photoUrl = (business.photo_url as string | null) ?? null;
  const isVerified = Boolean(business.is_verified);
  const consumptionOptions = ((business.consumption_options ?? []) as string[]).filter(
    (o) => ["comer_no_local", "para_levar", "entrega"].includes(o)
  );
  const avgRating = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;

  const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Olá ${name}, encontrei o seu estabelecimento no Bornaal e gostaria de saber mais.`
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

  const groupedItems = (catId: string | null) => menuItems.filter((i) => i.category_id === catId);
  const uncategorized = groupedItems(null);

  const openReport = () => {
    setReportReason("");
    setReportDescription("");
    setReportContact("");
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
        contact: reportContact.trim() || null,
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
          {photoUrl ? (
            <AvatarImage src={photoUrl} alt={name} className="object-cover" />
          ) : null}
          <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-2xl font-bold">
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-1.5">
            {name}
            {isVerified && (
              <BadgeCheck className="h-5 w-5 text-primary" aria-label="Estabelecimento verificado" />
            )}
          </h1>
          <Badge variant="secondary" className="mt-1 flex items-center gap-1">
            <Store className="h-3 w-3" /> {category}
          </Badge>
          {consumptionOptions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {consumptionOptions.map((o) => (
                <Badge key={o} variant="outline" className="text-[11px]">{CONSUMPTION_LABELS[o] ?? o}</Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <StarRating rating={Math.round(avgRating)} size="md" />
            <span className="text-sm text-muted-foreground">
              {avgRating.toFixed(1)} ({reviews.length})
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-6 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>{phone}</span>
        </div>
        {String(business.id ?? "") !== user?.id && (
          <Button variant="outline" className="w-full gap-2" onClick={openReport}>
            <AlertCircle className="h-5 w-5" />
            Denunciar
          </Button>
        )}
      </div>

      {description && (
        <div className="mb-6">
          <h2 className="font-semibold mb-1">Sobre</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}

      {menuItems.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" /> Menu
          </h2>
          <div className="flex flex-col gap-4">
            {menuCategories.map((cat) => {
              const items = groupedItems(cat.id);
              if (!items.length) return null;
              return (
                <div key={cat.id}>
                  <h3 className="text-sm font-semibold text-primary mb-2 border-b pb-1">{cat.name}</h3>
                  <div className="flex flex-col gap-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-lg border bg-card p-2.5">
                        {item.photo_url ? (
                          <img src={item.photo_url} alt={item.name} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                            <UtensilsCrossed className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-sm font-semibold text-primary">{formatCFA(item.price)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {uncategorized.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2 border-b pb-1">Outros</h3>
                <div className="flex flex-col gap-2">
                  {uncategorized.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border bg-card p-2.5">
                      {item.photo_url ? (
                        <img src={item.photo_url} alt={item.name} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                          <UtensilsCrossed className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-sm font-semibold text-primary">{formatCFA(item.price)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-2">
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block" onClick={trackWhatsapp}>
          <Button className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </Button>
        </a>
        <a href={`tel:${phone.replace(/\s/g, "")}`} className="block" onClick={trackCall}>
          <Button variant="secondary" className="w-full gap-2">
            <Phone className="h-5 w-5" />
            Ligar
          </Button>
        </a>
      </div>

      <section>
        <h2 className="font-semibold mb-3">Avaliações ({reviews.length})</h2>
        {reviews.length > 0 ? (
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <div key={r.id} className="p-3 rounded-lg border bg-card">
                <StarRating rating={r.rating} />
                {r.reviewer_name && (
                  <p className="text-sm font-medium mt-1">{r.reviewer_name}</p>
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
                <DialogTitle>Denunciar {name}</DialogTitle>
                <DialogDescription>
                  As denúncias são analisadas pela nossa equipa antes de qualquer ação. O estabelecimento não vê esta denúncia.
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
                <div className="grid gap-2">
                  <Label htmlFor="report-contact">Contacto (opcional)</Label>
                  <Input
                    id="report-contact"
                    type="tel"
                    placeholder="Telemóvel/WhatsApp para confirmarmos a denúncia"
                    value={reportContact}
                    onChange={(e) => setReportContact(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixa o teu contacto se quiseres que a nossa equipa te ligue para confirmar a denúncia.
                  </p>
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

export default BusinessDetail;