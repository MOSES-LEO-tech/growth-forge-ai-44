import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import SchoolGallery from "@/components/SchoolGallery";
import { useInView } from "@/hooks/useInView";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  verified: boolean;
  created_by: string | null;
}

const EventGallery = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { ref: headerRef, isInView: headerInView } = useInView({ threshold: 0.2 });
  const { ref: galleryRef, isInView: galleryInView } = useInView({ threshold: 0.1 });
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: media, isLoading: mediaLoading } = useQuery({
    queryKey: ["event-media", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_items")
        .select("*")
        .eq("event_id", id)
        .eq("verified", true);
      
      if (error) throw error;
      return data;
    },
  });

  if (eventLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-32 pb-16 container mx-auto px-4">
          <p className="text-center">Loading event...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-32 pb-16 container mx-auto px-4 text-center">
          <p className="mb-4">Event not found</p>
          <Button onClick={() => navigate("/gallery")}>Back to Gallery</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const mediaUrls = media?.map(m => m.media_url) || [];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/gallery")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Gallery
          </Button>

          {/* Event Header */}
          <div 
            ref={headerRef}
            className={`mb-12 transition-all duration-1000 ${
              headerInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{event.title}</h1>
            {event.description && (
              <p className="text-lg text-muted-foreground mb-4">{event.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(event.event_date), "MMMM dd, yyyy")}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Media Gallery */}
          <div 
            ref={galleryRef}
            className={`transition-all duration-1000 ${
              galleryInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {mediaLoading ? (
              <p className="text-center">Loading media...</p>
            ) : mediaUrls.length > 0 ? (
              <SchoolGallery images={mediaUrls} />
            ) : (
              <div className="text-center py-16 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">No media available for this event yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default EventGallery;
