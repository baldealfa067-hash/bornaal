import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./StarRating";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ProviderCardProps {
  id: string;
  name: string;
  category: string;
  location: string;
  photo_url?: string | null;
  avgRating: number;
  reviewCount: number;
}

export const ProviderCard = ({
  id, name, category, location, photo_url, avgRating, reviewCount
}: ProviderCardProps) => (
  <Link to={`/prestador/${id}`}>
    <Card className="overflow-hidden hover:shadow-md transition-shadow border-border/60">
      <CardContent className="p-4 flex gap-3 items-center">
        <Avatar className="h-14 w-14 rounded-lg">
          {photo_url ? (
            <AvatarImage src={photo_url} alt={name} className="object-cover" />
          ) : null}
          <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-lg">
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{name}</h3>
          <Badge variant="secondary" className="text-[11px] mt-0.5 font-medium">{category}</Badge>
          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={Math.round(avgRating)} />
            <span className="text-xs text-muted-foreground">({reviewCount})</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{location}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
);
