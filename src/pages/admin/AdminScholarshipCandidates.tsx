import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import SchoolAdminLayout from "@/components/SchoolAdminLayout";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import { dismissCandidate, listCandidates, promoteCandidate } from "@/lib/supabase/scholarshipsAdmin";
import { ArrowLeft, ExternalLink, Globe, ShieldAlert, Trash2 } from "lucide-react";

/**
 * Triage queue for leads found by web search. Promotion creates a draft — it
 * does not publish, and the draft still needs a verified source and terms.
 */
const AdminScholarshipCandidates = () => {
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const isPlatformAdmin = userRole === "super_admin";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: candidates, isLoading, error } = useQuery({
    queryKey: ["scholarship-candidates"],
    queryFn: listCandidates,
    enabled: isPlatformAdmin,
  });

  const promote = async (id: string) => {
    const candidate = (candidates ?? []).find((row) => row.id === id);
    if (!candidate) return;
    try {
      const scholarshipId = await promoteCandidate(candidate, user?.id ?? null);
      queryClient.invalidateQueries({ queryKey: ["scholarship-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["scholarships", "admin"] });
      toast({ title: "Promoted to draft", description: "Verify the provider and terms before publishing." });
      navigate(`/admin/scholarships/${scholarshipId}/edit`);
    } catch (error) {
      toast({
        title: "Could not promote",
        description: getErrorMessage(error, "Try again."),
        variant: "destructive",
      });
    }
  };

  const dismiss = async (id: string) => {
    try {
      await dismissCandidate(id);
      queryClient.invalidateQueries({ queryKey: ["scholarship-candidates"] });
    } catch (error) {
      toast({ title: "Could not dismiss", description: getErrorMessage(error, ""), variant: "destructive" });
    }
  };

  return (
    <SchoolAdminLayout>
      <AdminPageHeader
        kicker="Scholarships"
        title="Found online"
        description="Leads from web search. They are labelled unverified to students; promote one to a draft only after you have checked the provider's own page."
        actions={
          <Button asChild variant="ghost" className="gap-2">
            <Link to="/admin/scholarships">
              <ArrowLeft className="h-4 w-4" />
              Catalog
            </Link>
          </Button>
        }
      />

      {!isPlatformAdmin ? (
        <Card className="border-warning/30 bg-warning-soft">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-warning-ink">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            The discovery queue is managed by the platform team.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading leads…</p>
      ) : error ? (
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-sm text-destructive">
            {getErrorMessage(error, "The queue could not be loaded.")}
          </CardContent>
        </Card>
      ) : (candidates ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <Globe className="h-6 w-6 text-muted-foreground" />
            <p className="text-lg font-medium">No leads waiting</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Leads appear here after a student opens the scholarships widget and the search finds new
              pages that are not already in the catalog.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {(candidates ?? []).map((candidate) => (
            <li key={candidate.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{candidate.title}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        score {candidate.score}
                      </Badge>
                      {candidate.flagged_reason && (
                        <Badge variant="destructive" className="text-[10px]">
                          flagged: {candidate.flagged_reason}
                        </Badge>
                      )}
                    </div>
                    <a
                      href={candidate.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {candidate.domain}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {candidate.snippet && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{candidate.snippet}</p>
                    )}
                    {candidate.query && (
                      <p className="text-[11px] text-muted-foreground">found by: “{candidate.query}”</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => void promote(candidate.id)}>
                      Promote to draft
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Dismiss lead"
                      onClick={() => void dismiss(candidate.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </SchoolAdminLayout>
  );
};

export default AdminScholarshipCandidates;
