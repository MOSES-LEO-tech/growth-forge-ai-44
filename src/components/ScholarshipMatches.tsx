import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ExternalLink, Calendar } from "lucide-react";
import { getScholarships } from "@/lib/supabase/scholarships";
import type { Scholarship } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ScholarshipMatch {
  id: string;
  title: string;
  description: string;
  amount: number;
  deadline: string;
  organization: string;
  application_url: string;
  match_score: 'high' | 'medium' | 'low';
  match_reason: string;
  requirements: string[];
}

const ScholarshipMatches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const findMatches = async () => {
    setLoading(true);
    try {
      const data = await getScholarships();
      setMatches(data);
      toast({
        title: "Scholarships loaded",
        description: `Found ${data.length} scholarships for you!`,
      });
    } catch (error) {
      console.error('Error fetching scholarships:', error);
      toast({
        title: "Error",
        description: "Failed to fetch scholarships. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (score: string) => {
    switch (score) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Scholarship Matches
        </CardTitle>
        <CardDescription>
          Find scholarships that match your profile and achievements
        </CardDescription>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Discover scholarships tailored to your achievements
            </p>
            <Button onClick={findMatches} disabled={loading}>
              {loading ? "Finding Matches..." : "Find Scholarship Matches"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              onClick={findMatches}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? "Refreshing..." : "Refresh Matches"}
            </Button>
            <div className="grid gap-4">
              {matches.map((scholarship) => (
                <div
                  key={scholarship.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold">{scholarship.title}</h4>
                    </div>
                  </div>

                  <p className="text-sm">{scholarship.requirements}</p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {scholarship.amount && (
                      <span className="font-semibold text-primary">
                        ${scholarship.amount.toLocaleString()}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {scholarship.deadline ? new Date(scholarship.deadline).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScholarshipMatches;