import { Link } from "react-router-dom";
import { MapPin, MessageCircle, Phone, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./StarRating";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCFA } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

interface ProviderCardProps {
  id: string;
  name: string;
  category: string;
  location: string;
  phone: string;
  photo_url?: string | null;
  price_type?: string;
  starting_price?: number | null;
  services?: string[] | null;
  is_verified?: boolean | null;
  avgRating: number;
  reviewCount: number;
}

export const ProviderCard = ({
  id, name, category, location, phone, photo_url, price_type, starting_price, services, is_verified, avgRating, reviewCount
}: ProviderCardProps) => {
  const cleanPhone = phone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Olá ${name}, encontrei o seu perfil no BissauService e gostaria de saber mais sobre os seus serviços.`
  )}`;
  const telUrl = `tel:${phone.replace(/\s/g, "")}`;

  const trackContact = (type: "whatsapp" | "call") => {
    supabase.rpc("record_provider_contact", { p_provider_id: id, contact_type: type });
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow border-border/60">
      <CardContent className="p-4 flex gap-3 items-center">
        <Link to={`/prestador/${id}`} className="flex gap-3 items-center flex-1 min-w-0">
          <Avatar className="h-14 w-14 rounded-lg">
            {photo_url ? (
              <AvatarImage src={photo_url} alt={name} className="object-cover" />
            ) : null}
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-lg">
              {name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground flex items-center gap-1 min-w-0">
              <span className="truncate">{name}</span>
              {is_verified && (
                <BadgeCheck
                  className="h-4 w-4 text-primary shrink-0"
                  aria-label="Prestador verificado"
                />
              )}
            </h3>
            <Badge variant="secondary" className="text-[11px] mt-0.5 font-medium">{category}</Badge>
            {services && services.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {services.slice(0, 3).map((s) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {s}
                  </span>
                ))}
                {services.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{services.length - 3}</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={Math.round(avgRating)} />
              <span className="text-xs text-muted-foreground">({reviewCount})</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{location}</span>
            </div>
            {price_type === "fixo" && starting_price != null && (
              <div className="mt-1 text-xs font-semibold text-primary">
                {formatCFA(starting_price)}
              </div>
            )}
            {price_type === "negociavel" && (
              <div className="mt-1 text-xs font-semibold text-primary">
                Negociável
              </div>
            )}
            {price_type === "combinar" && (
              <div className="mt-1 text-xs text-muted-foreground">
                A combinar
              </div>
            )}
          </div>
        </Link>
        <div className="flex flex-col gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Contactar ${name} via WhatsApp`}
          onClick={() => trackContact("whatsapp")}
          >
            <Button size="icon" className="h-10 w-10 bg-[#25D366] hover:bg-[#1ebe57] text-white">
              <MessageCircle className="h-5 w-5" />
            </Button>
          </a>
          <a href={telUrl} aria-label={`Ligar para ${name}`} onClick={() => trackContact("call")}>
            <Button size="icon" variant="secondary" className="h-10 w-10">
              <Phone className="h-5 w-5" />
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
