import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicEvents } from "@/lib/supabase/gallery";
import type { GalleryEvent } from "@/integrations/supabase/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Search } from "lucide-react";
import EventTile from "@/components/EventTile";
import { useInView } from "@/hooks/useInView";

const Gallery = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(9);
  const { ref: heroRef, isInView: heroInView } = useInView({ threshold: 0.2 });
  const { ref: gridRef, isInView: gridInView } = useInView({ threshold: 0.1 });

  const { data: events, isLoading } = useQuery<GalleryEvent[]>({
    queryKey: ["events"],
    queryFn: async () => await getPublicEvents(),
  });

  const filteredEvents = events?.filter((event: GalleryEvent) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleEvents = filteredEvents?.slice(0, visibleCount) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="border-b pt-32">
        <div className="container mx-auto px-4 pb-16">
          <div
            ref={heroRef}
            className={`mx-auto max-w-4xl text-center transition-all duration-700 ${
              heroInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <p className="editorial-kicker mb-3">School life archive</p>
            <h1>Event Gallery</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              Explore school events, celebrations, projects, performances, and milestone moments in a calmer gallery layout.
            </p>

            <div className="relative mx-auto mt-8 max-w-xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 pr-4 text-base"
              />
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mx-auto mb-8 grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">All Events</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div ref={gridRef} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <div className="col-span-full py-16 text-center text-muted-foreground">Loading events...</div>
              ) : visibleEvents.length > 0 ? (
                visibleEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className={`transition-all duration-700 ${
                      gridInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                    } ${index === 0 ? "lg:col-span-2 lg:row-span-2" : ""}`}
                    style={{ transitionDelay: gridInView ? `${index * 70}ms` : "0ms" }}
                  >
                    <EventTile event={event as any} />
                  </div>
                ))
              ) : (
                <div className="col-span-full rounded-lg border border-dashed py-16 text-center text-muted-foreground">
                  <ImageIcon className="mx-auto mb-3 h-10 w-10 opacity-50" />
                  No events found.
                </div>
              )}
            </div>
            {filteredEvents && filteredEvents.length > visibleCount && (
              <div className="mt-8 flex justify-center">
                <Button onClick={() => setVisibleCount((c) => c + 9)} variant="outline">
                  Load More
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="photos">
            <div className="rounded-lg border border-dashed py-14 text-center text-muted-foreground">Photo filtering is coming soon.</div>
          </TabsContent>

          <TabsContent value="videos">
            <div className="rounded-lg border border-dashed py-14 text-center text-muted-foreground">Video filtering is coming soon.</div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Gallery;
