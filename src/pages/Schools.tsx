import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SchoolCard from "@/components/SchoolCard";
import { useInView } from "@/hooks/useInView";
import schoolsService, { School } from "@/services/schools";
import { useToast } from "@/components/ui/use-toast";

const Schools = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  
  const { ref: heroRef, isInView: heroInView } = useInView({ threshold: 0.2 });
  const { ref: gridRef, isInView: gridInView } = useInView({ threshold: 0.1 });
  const { toast } = useToast();

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await schoolsService.getSchools({
          page: 1,
          limit: 20,
          search: searchQuery
        });
        setSchools(response.schools);
        setPagination(response.pagination);
      } catch (err: any) {
        console.error('Error fetching schools:', err);
        setError(err.response?.data?.message || 'Failed to load schools');
        toast({
          title: 'Error',
          description: 'Failed to load schools',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const debounce = setTimeout(() => {
      fetchSchools();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, toast]);

  const filteredSchools = schools.filter(school => 
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (school.location && school.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (school.type && school.type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div 
            ref={heroRef}
            className={`text-center max-w-3xl mx-auto transition-all duration-1000 ${
              heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Meet Our
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Partner Schools</span>
              <span className="ml-3">🌍</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              These institutions collaborate with us to empower students through modern learning, creativity, and technology.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, location, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Schools Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading schools...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-xl text-destructive">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div 
                ref={gridRef}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {filteredSchools.map((school, index) => (
                  <div
                    key={school.id}
                    className={`transition-all duration-700 ${
                      gridInView 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 translate-y-8'
                    }`}
                    style={{ 
                      transitionDelay: gridInView ? `${index * 100}ms` : '0ms'
                    }}
                  >
                    <SchoolCard school={school} />
                  </div>
                ))}
              </div>

              {filteredSchools.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-xl text-muted-foreground">No schools found matching your search.</p>
                </div>
              )}

              {/* Pagination Info */}
              {pagination.total > 0 && (
                <div className="text-center mt-8 text-muted-foreground">
                  Showing {filteredSchools.length} of {pagination.total} schools
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Schools;
