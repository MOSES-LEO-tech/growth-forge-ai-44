import { Calendar, MapPin, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  verified: boolean;
  media_url?: string;
}

interface EventTileProps {
  event: Event;
}

const EventTile = ({ event }: EventTileProps) => {
  const navigate = useNavigate();
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchEventMedia = async () => {
      try {
        // If there's already a media_url, use it
        if (event.media_url) {
          setMediaUrl(event.media_url);
          return;
        }

        // Otherwise check if there are uploaded files
        const { data, error } = await supabase.storage
          .from('gallery-files')
          .list(`${event.id}`);

        if (error) {
          console.error('Error fetching gallery files:', error);
          return;
        }

        // If there are files, get the URL of the first image
        if (data && data.length > 0) {
          // Find the first image file
          const imageFile = data.find(file => 
            file.name.match(/\.(jpeg|jpg|png|gif|webp)$/i)
          );
          
          if (imageFile) {
            const { data: urlData } = await supabase.storage
              .from('gallery-files')
              .getPublicUrl(`${event.id}/${imageFile.name}`);
            
            setMediaUrl(urlData.publicUrl);
          }
        }
      } catch (error) {
        console.error('Error processing gallery files:', error);
      }
    };

    fetchEventMedia();
  }, [event.id, event.media_url]);

  return (
    <Card 
      className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300"
      onClick={() => navigate(`/gallery/${event.id}`)}
    >
      {/* Cover Image */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        {mediaUrl ? (
          <img 
            src={mediaUrl} 
            alt={event.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="w-16 h-16 text-primary/40" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          {event.verified && (
            <Badge variant="secondary" className="ml-2">Verified</Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
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
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventTile;
