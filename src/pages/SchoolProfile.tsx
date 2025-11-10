import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DbSchool = import("@/integrations/supabase/types").Tables<"schools">;
type MediaItem = import("@/integrations/supabase/types").Tables<"media_items">;

const SchoolProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [school, setSchool] = useState<DbSchool | null>(null);
  const [gallery, setGallery] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const schoolQuery = supabase.from("schools").select("*").eq("id", id).maybeSingle();
      const galleryQuery = supabase
        .from("media_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      const [{ data: s, error: se }, { data: g, error: ge }] = await Promise.all([
        schoolQuery,
        galleryQuery,
      ]);
      if (se) setError(se.message);
      else setSchool(s as DbSchool);
      if (!ge && g) setGallery(g as MediaItem[]);
      setLoading(false);
    };
    if (id) load();
  }, [id]);

  const isSchoolAdmin = Boolean(
    profile?.role === "admin" && school && profile?.school_id && String(profile.school_id) === String(school.id)
  );

  const goToAdmin = () => {
    if (school) navigate(`/admin?schoolId=${school.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        {loading ? (
          <div className="text-center py-12">Loading school...</div>
        ) : error ? (
          <div className="text-center text-destructive">{error}</div>
        ) : !school ? (
          <div className="text-center">School not found.</div>
        ) : (
          <div className="space-y-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    {school.logo_url ? (
                      <img src={school.logo_url} alt="Logo" className="w-10 h-10 rounded" />
                    ) : null}
                    {school.name}
                  </CardTitle>
                  <div className="text-muted-foreground">
                    {school.location}
                  </div>
                </div>
                {isSchoolAdmin ? (
                  <Button onClick={goToAdmin} variant="default">Manage School</Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {school.description ? (
                  <p className="mb-2">{school.description}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Students: {school.student_count ?? 0}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gallery</CardTitle>
              </CardHeader>
              <CardContent>
                {gallery.length === 0 ? (
                  <div className="text-muted-foreground">No media yet.</div>
                ) : (
                  <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {gallery.map((m) => (
                      <div key={m.id} className="aspect-square bg-muted rounded overflow-hidden">
                        {m.media_type === "image" ? (
                          <img src={m.media_url || ""} alt={m.title || ""} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                            {m.media_type} content
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default SchoolProfile;
