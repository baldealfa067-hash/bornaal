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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

type ReportReasonKey = "notDone" | "charge" | "behaviour" | "fake" | "other";
const REPORT_REASONS: { key: ReportReasonKey; labelKey: string }[] = [
  { key: "notDone", labelKey: "providerDetail.reportReasons.notDone" },
  { key: "charge", labelKey: "providerDetail.reportReasons.charge" },
  { key: "behaviour", labelKey: "providerDetail.reportReasons.behaviour" },
  { key: "fake", labelKey: "providerDetail.reportReasons.fake" },
  { key: "other", labelKey: "providerDetail.reportReasons.other" },
];

const ProviderDetail = () => {
  const { t } = useTranslation();
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
  const [reportContact, setReportContact] = useState("");

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
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">{t("providerDetail.loading")}</div>;
  }

  if (!provider) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">{t("providerDetail.notFound")}</div>;
  }

  const whatsappUrl = `https://wa.me/${provider.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    t("providerDetailExtra.whatsappMsg", { name: provider.name })
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
    setReportContact("");
    setReportStep("form");
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!id) return;
    if (!reportReason.trim() || !reportDescription.trim()) {
      toast.error(t("providerDetail.chooseReasonDesc"));
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
        toast.error(t("providerDetail.reportError"));
      } else {
        setReportStep("success");
      }
    } catch (e) {
      console.error("[complaints] exception:", e);
      toast.error(t("providerDetail.reportError"));
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
              <BadgeCheck className="h-5 w-5 text-primary" aria-label={t("providerDetailExtra.verifiedLabel")} />
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
            <span className="font-semibold">{t("providerDetail.negotiable")}</span>
          </div>
        )}
        {provider.price_type === "combinar" && (
          <div className="flex items-center gap-2 text-foreground">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="font-semibold">{t("providerDetail.toCombine")}</span>
          </div>
        )}
        {/* Botão de denunciar (qualquer visitante) */}
        {provider.id !== user?.id && (
          <Button variant="outline" className="w-full gap-2" onClick={openReport}>
            <AlertCircle className="h-5 w-5" />
            {t("providerDetail.report")}
          </Button>
        )}
      </div>

      {provider.description && (
        <div className="mb-6">
          <h2 className="font-semibold mb-1">{t("providerDetail.about")}</h2>
          <p className="text-sm text-muted-foreground">{provider.description}</p>
        </div>
      )}

      {portfolio.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold mb-2">{t("providerDetail.previousWorks")}</h2>
          <div className="grid grid-cols-2 gap-2">
            {portfolio.map((img) => (
              <a
                key={img.id}
                href={img.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square overflow-hidden rounded-lg border bg-muted"
              >
                <img src={img.image_url} alt={t("providerDetailExtra.workAlt")} className="w-full h-full object-cover hover:scale-105 transition-transform" loading="lazy" />
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
            {t("common.whatsapp")}
          </Button>
        </a>
        <a href={`tel:${provider.phone.replace(/\s/g, "")}`} className="block" onClick={trackCall}>
          <Button variant="secondary" className="w-full gap-2">
            <Phone className="h-5 w-5" />
            {t("common.call")}
          </Button>
        </a>
      </div>

      <section>
        <h2 className="font-semibold mb-3">{t("providerDetail.reviewsCount", { count: provider.reviewCount })}</h2>

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
                  {new Date(r.created_at).toLocaleDateString(i18n.language)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("providerDetail.noReviews")}</p>
        )}
      </section>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          {reportStep === "form" && (
            <>
              <DialogHeader>
                <DialogTitle>{t("providerDetail.reportTitle", { name: provider.name })}</DialogTitle>
                <DialogDescription>
                  {t("providerDetail.reportDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="report-reason">{t("providerDetail.reason")}</Label>
                  <Select value={reportReason} onValueChange={setReportReason}>
                    <SelectTrigger id="report-reason">
                      <SelectValue placeholder={t("providerDetail.selectReason")} />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_REASONS.map((r) => (
                        <SelectItem key={r.key} value={t(r.labelKey)}>{t(r.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="report-description">{t("providerDetail.description")}</Label>
                  <Textarea
                    id="report-description"
                    placeholder={t("providerDetail.descriptionPlaceholder")}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="report-contact">{t("providerDetail.contactOptional")}</Label>
                  <Input
                    id="report-contact"
                    type="tel"
                    placeholder={t("providerDetail.contactPlaceholder")}
                    value={reportContact}
                    onChange={(e) => setReportContact(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("providerDetail.contactHint")}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReportOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={submitReport}
                  disabled={complaining || !reportReason || !reportDescription.trim()}
                  className="gap-2"
                >
                  <ShieldAlert className="h-4 w-4" />
                  {complaining ? t("providerDetail.sending") : t("providerDetail.submitReport")}
                </Button>
              </DialogFooter>
            </>
          )}

          {reportStep === "success" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  {t("providerDetail.reportSent")}
                </DialogTitle>
                <DialogDescription>
                  {t("providerDetail.reportSentDesc")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setReportOpen(false)}>{t("common.close")}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderDetail;
