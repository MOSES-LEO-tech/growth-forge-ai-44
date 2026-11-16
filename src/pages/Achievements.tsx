import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { Award, FileText } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-900",
  rejected: "bg-rose-100 text-rose-800",
};

/**
 * Every achievement the student has logged, with its verification state.
 *
 * The dashboard used to show two of these inline; a full list belongs on its own
 * page, and it is the honest source the CV reads from.
 */
const Achievements = () => {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["achievements-page", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("id,title,description,category,date_earned,verified,approval_status,rejection_reason")
        .eq("user_id", user?.id as string)
        .order("date_earned", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const verified = (data ?? []).filter((row) => row.verified).length;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 app-main">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="editorial-kicker mb-2">Achievements</p>
            <h1 className="text-3xl font-semibold tracking-tight">Your awards</h1>
            <p className="mt-2 text-muted-foreground">
              Only verified awards carry the school's endorsement and appear on your public profile.
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/cv">
              <FileText className="h-4 w-4" />
              Build a CV from these
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive/40">
            <CardContent className="p-6 text-sm text-destructive">
              {getErrorMessage(error, "Achievements could not be loaded.")}
            </CardContent>
          </Card>
        ) : (data ?? []).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <Award className="h-7 w-7 text-muted-foreground" />
              <p className="text-lg font-medium">No achievements yet</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Add an award from your dashboard. A teacher or school admin verifies it before it counts.
              </p>
              <Button asChild>
                <Link to="/dashboard">Back to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {verified} of {(data ?? []).length} verified
            </p>
            <ul className="grid gap-3">
              {(data ?? []).map((achievement) => (
                <li key={achievement.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium">{achievement.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            achievement.category,
                            achievement.date_earned
                              ? new Date(achievement.date_earned).toLocaleDateString(undefined, {
                                  month: "short",
                                  year: "numeric",
                                })
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {achievement.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{achievement.description}</p>
                        )}
                        {achievement.approval_status === "rejected" && achievement.rejection_reason && (
                          <p className="mt-1 text-xs text-rose-700">{achievement.rejection_reason}</p>
                        )}
                      </div>
                      <Badge className={STATUS_STYLE[achievement.approval_status ?? "pending"] ?? ""}>
                        {achievement.verified ? "Verified" : achievement.approval_status ?? "pending"}
                      </Badge>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Achievements;
