import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, MapPin, Phone, MessageCircle, BadgeCheck, CheckCircle2, ShieldAlert, Store, UtensilsCrossed, Plus, Minus, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/StarRating";
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
import { useQueryClient } from "@tanstack/react-query";

type ReportReasonKey = "food" | "charge" | "behaviour" | "fake" | "hygiene" | "other";
const REPORT_REASONS: { key: ReportReasonKey; labelKey: string }[] = [
  { key: "food", labelKey: "businessDetail.reportReasons.food" },
  { key: "charge", labelKey: "businessDetail.reportReasons.charge" },
  { key: "behaviour", labelKey: "businessDetail.reportReasons.behaviour" },
  { key: "fake", labelKey: "businessDetail.reportReasons.fake" },
  { key: "hygiene", labelKey: "businessDetail.reportReasons.hygiene" },
  { key: "other", labelKey: "businessDetail.reportReasons.other" },
];

const CONSUMPTION_LABEL_KEYS: Record<string, string> = {
  comer_no_local: "businessDetail.consumption.eatIn",
  para_levar: "businessDetail.consumption.takeAway",
  entrega: "businessDetail.consumption.delivery",
};

type MenuCategory = { id: string; name: string };
type MenuItem = { id: string; name: string; price: number; photo_url: string | null; category_id: string | null };
type Review = { id: string; rating: number; comment: string | null; created_at: string; reviewer_name: string | null };

const BusinessDetail = () => {
  const { t } = useTranslation();
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
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [reviewerName, setReviewerName] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [consumptionOption, setConsumptionOption] = useState("");
  const [address, setAddress] = useState("");
  const [sending, setSending] = useState(false);

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
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">{t("businessDetail.loading")}</div>;
  }

  if (!business || business.profile_type !== "business") {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">{t("businessDetail.notFound")}</div>;
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
  const activeConsumption = consumptionOption || consumptionOptions[0] || "";
  const cartItems = menuItems.filter((i) => (cart[i.id] ?? 0) > 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * (cart[i.id] ?? 0), 0);
  const cartCount = cartItems.reduce((sum, i) => sum + (cart[i.id] ?? 0), 0);

  const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    t("businessDetailExtra.whatsappMsg", { name })
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

  const addToCart = (itemId: string) => setCart((c) => ({ ...c, [itemId]: (c[itemId] ?? 0) + 1 }));
  const removeFromCart = (itemId: string) => {
    setCart((c) => {
      const qty = (c[itemId] ?? 0) - 1;
      if (qty <= 0) {
        const { [itemId]: _, ...rest } = c;
        return rest;
      }
      return { ...c, [itemId]: qty };
    });
  };

  const sendOrder = async () => {
    if (!id) return;
    if (!cartItems.length) return toast.error(t("businessDetail.addItems"));
    if (!activeConsumption) return toast.error(t("businessDetail.chooseConsumption"));
    if (activeConsumption === "entrega" && !address.trim()) {
      return toast.error(t("businessDetail.enterAddress"));
    }
    setSending(true);
    const lines = cartItems
      .map((i) => `• ${i.name} x${cart[i.id]} — ${formatCFA(i.price * (cart[i.id] ?? 0))}`)
      .join("\n");
    const consumptionLabel = activeConsumption ? t(CONSUMPTION_LABEL_KEYS[activeConsumption] ?? activeConsumption) : activeConsumption;
    const addressLine = activeConsumption === "entrega" ? `\n${t("businessDetailExtra.deliveryAddressLine", { address: address.trim() })}` : "";
    const message =
      `${t("businessDetailExtra.orderGreeting", { name })}\n\n${lines}\n\n` +
      `${t("businessDetailExtra.orderConsumption", { option: consumptionLabel })}${addressLine}\n${t("businessDetailExtra.orderTotal", { total: formatCFA(cartTotal) })}`;
    const waUrl = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    const { error } = await supabase.rpc("record_business_order", {
      p_business_id: id,
      p_items: cartItems.map((i) => ({ name: i.name, price: i.price, qty: cart[i.id] })),
      p_total: cartTotal,
      p_consumption_option: activeConsumption,
      p_address: activeConsumption === "entrega" ? address.trim() : null,
    });
    setSending(false);
    if (error) {
      console.error("[order] error:", error.message);
      return toast.error(t("businessDetail.orderError"));
    }
    window.open(waUrl, "_blank");
    toast.success(t("businessDetail.orderSuccess"));
    setCart({});
    setAddress("");
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

  const submitDirectReview = async () => {
    if (!id) return;
    if (rating < 1) {
      toast.error(t("businessDetail.selectStars"));
      return;
    }
    if (!reviewerName.trim()) {
      toast.error(t("businessDetail.enterName"));
      return;
    }
    if (!user) {
      toast.error(t("businessDetail.loginToReview"));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      provider_id: id,
      rating,
      comment: comment.trim() || null,
      reviewer_name: reviewerName.trim(),
      user_id: user.id,
      request_id: null,
    } as never);
    setSubmitting(false);
    if (error) {
      toast.error(t("businessDetail.reviewError") + ": " + error.message);
      return;
    }
    toast.success(t("businessDetail.reviewSent"));
    setRating(0);
    setReviewerName("");
    setComment("");
    queryClient.invalidateQueries({ queryKey: ["provider", id] });
  };

  const submitReport = async () => {
    if (!id) return;
    if (!reportReason.trim() || !reportDescription.trim()) {
      toast.error(t("businessDetail.chooseReasonDesc"));
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
        toast.error(t("businessDetail.reportError"));
      } else {
        setReportStep("success");
      }
    } catch (e) {
      console.error("[complaints] exception:", e);
      toast.error(t("businessDetail.reportError"));
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
              <BadgeCheck className="h-5 w-5 text-primary" aria-label={t("businessDetailExtra.verifiedLabel")} />
            )}
          </h1>
          <Badge variant="secondary" className="mt-1 flex items-center gap-1">
            <Store className="h-3 w-3" /> {category}
          </Badge>
          {consumptionOptions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {consumptionOptions.map((o) => (
                <Badge key={o} variant="outline" className="text-[11px]">{t(CONSUMPTION_LABEL_KEYS[o] ?? o)}</Badge>
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
            {t("businessDetail.report")}
          </Button>
        )}
      </div>

      {description && (
        <div className="mb-6">
          <h2 className="font-semibold mb-1">{t("businessDetail.about")}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}

      {menuItems.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" /> {t("businessDetail.menu")}
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
                      <MenuItemRow key={item.id} item={item} qty={cart[item.id] ?? 0} onAdd={() => addToCart(item.id)} onRemove={() => removeFromCart(item.id)} />
                    ))}
                  </div>
                </div>
              );
            })}
            {uncategorized.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2 border-b pb-1">{t("businessDetail.others")}</h3>
                <div className="flex flex-col gap-2">
                  {uncategorized.map((item) => (
                    <MenuItemRow key={item.id} item={item} qty={cart[item.id] ?? 0} onAdd={() => addToCart(item.id)} onRemove={() => removeFromCart(item.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {cartItems.length > 0 && (
        <Card className="mb-6 border-primary/40">
          <CardContent className="p-4">
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" /> {t("businessDetail.orderTitle", { count: cartCount })}
            </h2>
            <div className="flex flex-col gap-1.5 mb-3">
              {cartItems.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <span className="min-w-0 truncate">{i.name} x{cart[i.id]}</span>
                  <span className="font-medium shrink-0">{formatCFA(i.price * (cart[i.id] ?? 0))}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-bold border-t pt-1.5">
                <span>{t("businessDetail.estimatedTotal")}</span>
                <span>{formatCFA(cartTotal)}</span>
              </div>
            </div>

            {consumptionOptions.length > 0 && (
              <div className="mb-3">
                <Label className="text-xs">{t("businessDetail.consumptionOption")}</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {consumptionOptions.map((o) => (
                    <Badge
                      key={o}
                      variant={activeConsumption === o ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1.5 text-xs"
                      onClick={() => setConsumptionOption(o)}
                    >
                      {t(CONSUMPTION_LABEL_KEYS[o] ?? o)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {activeConsumption === "entrega" && (
              <div className="mb-3">
                <Label htmlFor="order-address">{t("businessDetail.deliveryAddress")}</Label>
                <Input
                  id="order-address"
                  placeholder={t("businessDetail.addressPlaceholder")}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            )}

            <Button onClick={sendOrder} disabled={sending} className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
              {sending ? t("businessDetail.registering") : t("businessDetail.sendOrder")}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              {t("businessDetail.orderHint")}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mb-8 grid grid-cols-2 gap-2">
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block" onClick={trackWhatsapp}>
          <Button className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2">
            <MessageCircle className="h-5 w-5" />
            {t("common.whatsapp")}
          </Button>
        </a>
        <a href={`tel:${phone.replace(/\s/g, "")}`} className="block" onClick={trackCall}>
          <Button variant="secondary" className="w-full gap-2">
            <Phone className="h-5 w-5" />
            {t("common.call")}
          </Button>
        </a>
      </div>

      <section>
        <h2 className="font-semibold mb-3">{t("businessDetail.reviewsCount", { count: reviews.length })}</h2>

        <div className="p-4 rounded-lg border bg-card mb-4 space-y-3">
          <p className="text-sm font-medium">{t("businessDetail.leaveReview")}</p>
          <div className="flex items-center gap-2">
            <StarRating rating={rating} onChange={setRating} size="md" />
          </div>
          <Input
            placeholder={t("businessDetail.yourName")}
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
          />
          <Textarea
            placeholder={t("businessDetail.commentOptional")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          {user ? (
            <Button onClick={submitDirectReview} disabled={submitting} className="w-full">
              {submitting ? t("businessDetail.sending") : t("businessDetail.submitReview")}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground text-center">{t("businessDetail.loginToReview")}</p>
          )}
        </div>

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
                  {new Date(r.created_at).toLocaleDateString(i18n.language)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("businessDetail.noReviews")}</p>
        )}
      </section>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          {reportStep === "form" && (
            <>
              <DialogHeader>
                <DialogTitle>{t("businessDetail.reportTitle", { name })}</DialogTitle>
                <DialogDescription>
                  {t("businessDetail.reportDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="report-reason">{t("businessDetail.reason")}</Label>
                  <Select value={reportReason} onValueChange={setReportReason}>
                    <SelectTrigger id="report-reason">
                      <SelectValue placeholder={t("businessDetail.selectReason")} />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_REASONS.map((r) => (
                        <SelectItem key={r.key} value={t(r.labelKey)}>{t(r.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="report-description">{t("businessDetail.description")}</Label>
                  <Textarea
                    id="report-description"
                    placeholder={t("businessDetail.descriptionPlaceholder")}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="report-contact">{t("businessDetail.contactOptional")}</Label>
                  <Input
                    id="report-contact"
                    type="tel"
                    placeholder={t("businessDetail.contactPlaceholder")}
                    value={reportContact}
                    onChange={(e) => setReportContact(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("businessDetail.contactHint")}
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
                  {complaining ? t("businessDetail.sending") : t("businessDetail.submitReport")}
                </Button>
              </DialogFooter>
            </>
          )}

          {reportStep === "success" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  {t("businessDetail.reportSent")}
                </DialogTitle>
                <DialogDescription>
                  {t("businessDetail.reportSentDesc")}
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

const MenuItemRow = ({ item, qty, onAdd, onRemove }: { item: MenuItem; qty: number; onAdd: () => void; onRemove: () => void }) => {
  const { t } = useTranslation();
  return (
  <div className="flex items-center gap-3 rounded-lg border bg-card p-2.5">
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
    {qty === 0 ? (
      <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={onAdd}>
        <Plus className="h-3.5 w-3.5" /> {t("common.add")}
      </Button>
    ) : (
      <div className="flex items-center gap-1 shrink-0">
        <Button size="icon" variant="outline" className="h-8 w-8" onClick={onRemove}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-6 text-center font-semibold text-sm">{qty}</span>
        <Button size="icon" className="h-8 w-8" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    )}
  </div>
  );
};

export default BusinessDetail;
