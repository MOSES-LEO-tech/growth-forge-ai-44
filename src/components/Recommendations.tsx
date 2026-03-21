import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getRecommendations } from "@/lib/supabase/recommendations";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  title: string;
  description: string;
  category: 'project' | 'skill' | 'activity';
  priority: 'high' | 'medium' | 'low';
}

const Recommendations = () => {
  const { user } = useAuth();
  const [recommendationsList, setRecommendationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateRecommendations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('generate-recommendations', {
        body: { userId: user.id, type: 'profile' }
      });

      if (error) throw error;

      const recs = await getRecommendations(user.id);
      setRecommendationsList(recs);
      
      toast({
        title: "Recommendations generated",
        description: "Here are personalized suggestions for you!",
      });
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to generate recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'project': return <TrendingUp className="w-4 h-4" />;
      case 'skill': return <Sparkles className="w-4 h-4" />;
      case 'activity': return <Lightbulb className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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
          <Lightbulb className="w-5 h-5" />
          Personalized Recommendations
        </CardTitle>
        <CardDescription>
          AI-powered suggestions to help you grow and achieve your goals
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recommendationsList.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Get personalized recommendations based on your profile and achievements
            </p>
            <Button onClick={generateRecommendations} disabled={loading}>
              {loading ? "Generating..." : "Generate Recommendations"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              onClick={generateRecommendations}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? "Refreshing..." : "Refresh Recommendations"}
            </Button>
            <div className="grid gap-3">
              {recommendationsList.map((rec, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg p-4 space-y-2 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(rec.type || 'activity')}
                      <h4 className="font-semibold">{typeof rec.content === 'string' ? rec.content : rec.content?.title || 'Recommendation'}</h4>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{typeof rec.content === 'object' ? rec.content?.description : rec.content}</p>
                  <Badge variant="outline" className="text-xs">
                    {rec.type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Recommendations;