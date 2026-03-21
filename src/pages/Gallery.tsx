import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicEvents } from "@/lib/supabase/gallery";
import type { Event } from "@/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import EventTile from "@/components/EventTile";
import { useInView } from "@/hooks/useInView";

const Gallery = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(9);
  const { ref: heroRef, isInView: heroInView } = useInView({ threshold: 0.2 });
  const { ref: gridRef, isInView: gridInView } = useInView({ threshold: 0.1 });

  const { data: events, isLoading } = useQuery<GalleryEvent[]>({
    queryKey: ["events"],
    queryFn: async () => {
      return await getPublicEvents();
    },
  });

  const filteredEvents = events?.filter((event: GalleryEvent) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleEvents = filteredEvents?.slice(0, visibleCount) || [];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div
            ref={heroRef}
            className={`text-center max-w-3xl mx-auto transition-all duration-1000 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Event
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Gallery</span>
              <span className="ml-3">📸</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Explore memorable moments from school events, celebrations, and achievements.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg"
              />
            </div>

            {/* Filter Tabs */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
                <TabsTrigger value="all">All Events</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
                <TabsTrigger value="videos">Videos</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-8">
                <div
                  ref={gridRef}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {isLoading ? (
                    <div className="col-span-full text-center py-16">
                      <p className="text-muted-foreground">Loading events...</p>
                    </div>
                  ) : visibleEvents && visibleEvents.length > 0 ? (
                    visibleEvents.map((event, index) => (
                      <div
                        key={event.id}
                        className={`transition-all duration-700 ${gridInView
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-8'
                          }`}
                        style={{
                          transitionDelay: gridInView ? `${index * 100}ms` : '0ms'
                        }}
                      >
                        <EventTile event={event} />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-16">
                      <p className="text-muted-foreground">No events found.</p>
                    </div>
                  )}
                </div>
                {filteredEvents && filteredEvents.length > visibleCount && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => setVisibleCount(c => c + 9)}
                      className="px-4 py-2 rounded bg-primary text-primary-foreground"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="photos" className="mt-8">
                <p className="text-center text-muted-foreground">Photo filtering coming soon!</p>
              </TabsContent>

              <TabsContent value="videos" className="mt-8">
                <p className="text-center text-muted-foreground">Video filtering coming soon!</p>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Gallery;
