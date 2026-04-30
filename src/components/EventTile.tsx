import { Calendar, MapPin, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  verified: boolean;
  thumbnail_url?: string | null;
}

interface EventTileProps {
  event: Event;
}

const EventTile = ({ event }: EventTileProps) => {
  const navigate = useNavigate();

  return (
    <Card
      className="media-tile group cursor-pointer"
      onClick={() => navigate(`/gallery/${event.id}`)}
    >
      <div className="relative aspect-[4/3] bg-muted">
        {event.thumbnail_url ? (
          <img
            src={event.thumbnail_url}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <ImageIcon className="h-12 w-12 text-secondary-foreground/55" />
          </div>
        )}
        {event.verified && (
          <Badge className="absolute left-3 top-3 gap-1 bg-card text-foreground shadow-sm">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            Verified
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="line-clamp-1 text-lg font-semibold transition-colors group-hover:text-primary">
            {event.title}
          </h3>
        </div>

        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
          {event.description || "No description available"}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(event.event_date), "MMM dd, yyyy")}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventTile;
