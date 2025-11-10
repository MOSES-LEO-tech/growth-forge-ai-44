import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SchoolCard from "@/components/SchoolCard";
import { useInView } from "@/hooks/useInView";

type DbSchool = import("@/integrations/supabase/types").Tables<"schools">;

const Schools = () => {
  const [schools, setSchools] = useState<DbSchool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { ref, isInView } = useInView({ threshold: 0.1 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) setError(error.message);
      else setSchools((data ?? []) as DbSchool[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schools.filter((s) => {
      const matchesQuery = !q ||
        (s.name || "").toLowerCase().includes(q) ||
        (s.location || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q);
      return matchesQuery;
    });
  }, [schools, query]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <section className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Schools</h1>
          <p className="text-muted-foreground">Discover schools and view their profiles and galleries.</p>
        </section>
        <section className="mb-6">
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Search by name, location, description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </section>
        {loading ? (
          <div className="text-center py-12">Loading schools...</div>
        ) : error ? (
          <div className="text-center text-destructive">{error}</div>
        ) : (
          <div ref={ref} className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <SchoolCard
                key={s.id}
                school={{
                  id: String(s.id),
                  name: s.name || "Unnamed School",
                  logoUrl: s.logo_url || undefined,
                  location: s.location || "",
                  studentCount: s.student_count || 0,
                  tagline: s.description || "",
                  type: "School",
                }}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Schools;
