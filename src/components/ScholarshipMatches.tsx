import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ExternalLink, Calendar } from "lucide-react";
import { scholarship } from "@/services/api";
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
  const [matches, setMatches] = useState<ScholarshipMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const findMatches = async () => {
    setLoading(true);
    try {
      const response = await scholarship.match();
      const data = response.data;

      setMatches(data.matches);
      toast({
        title: "Scholarships matched",
        description: `Found ${data.matches.length} matching scholarships for you!`,
      });
    } catch (error) {
      console.error('Error matching scholarships:', error);
      toast({
        title: "Error",
        description: "Failed to find scholarship matches. Please try again.",
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
                      <p className="text-sm text-muted-foreground">
                        {scholarship.organization}
                      </p>
                    </div>
                    <Badge variant={getMatchColor(scholarship.match_score)}>
                      {scholarship.match_score} match
                    </Badge>
                  </div>

                  <p className="text-sm">{scholarship.description}</p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {scholarship.amount && (
                      <span className="font-semibold text-primary">
                        ${scholarship.amount.toLocaleString()}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {new Date(scholarship.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="bg-muted p-3 rounded text-sm">
                    <p className="font-medium mb-1">Why it matches:</p>
                    <p className="text-muted-foreground">{scholarship.match_reason}</p>
                  </div>

                  {scholarship.requirements && scholarship.requirements.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {scholarship.requirements.map((req, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {scholarship.application_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(scholarship.application_url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Apply Now
                    </Button>
                  )}
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