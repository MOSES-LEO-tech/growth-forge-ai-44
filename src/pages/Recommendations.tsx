import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Trophy, Target, Zap, ChevronRight, CheckCircle, ExternalLink, RefreshCw, Sparkles, AlertCircle, Bell, Clock } from 'lucide-react';
import { getRecommendations, generateRecommendations } from '@/lib/supabase/recommendations';
import { useInView } from '@/hooks/useInView';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface ScholarshipRecommendation {
  scholarship_title: string;
  match_score: number;
  reason: string;
  action: string;
}

interface ProfileSuggestion {
  area: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

interface ActionItem {
  action: string;
  category: string;
  urgency: 'high' | 'medium' | 'low';
  deadline_related: boolean;
}

const Recommendations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { ref: heroRef, isInView: heroInView } = useInView({ threshold: 0.1 });
  const { ref: scholarRef, isInView: scholarInView } = useInView({ threshold: 0.1 });
  const { ref: profileRef, isInView: profileInView } = useInView({ threshold: 0.1 });
  const { ref: actionRef, isInView: actionInView } = useInView({ threshold: 0.1 });

  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['recommendations', user?.id],
    queryFn: () => getRecommendations(user!.id),
    enabled: !!user?.id,
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateRecommendations('all');
      if (result.success) {
        toast({
          title: "Success!",
          description: "Your personalized recommendations have been generated.",
        });
        queryClient.invalidateQueries({ queryKey: ['recommendations', user?.id] });
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to generate recommendations",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const scholarshipRecs = (recommendations?.find(r => r.type === 'scholarship')?.content as any) as ScholarshipRecommendation[] || [];
  const profileRec = (recommendations?.find(r => r.type === 'profile')?.content as any) || null;
  const actionRecs = (recommendations?.find(r => r.type === 'actions')?.content as any) as ActionItem[] || [];

  const hasData = scholarshipRecs.length > 0 || profileRec || actionRecs.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <section 
          ref={heroRef}
          className={`space-y-6 transition-all duration-700 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">AI Recommendations</h1>
              <p className="text-xl text-muted-foreground">
                Personalized guidance powered by Claude to accelerate your academic journey.
              </p>
            </div>
            <Button 
              size="lg" 
              className="group relative overflow-hidden bg-primary hover:bg-primary/90 transition-all"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Claude is analysing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5 animate-pulse text-yellow-400" />
                  Generate AI Recommendations
                </>
              )}
            </Button>
          </div>
        </section>

        {!hasData && !isGenerating ? (
          <section className="py-20 text-center space-y-6">
            <div className="bg-primary/5 rounded-full p-8 w-fit mx-auto">
              <Sparkles className="h-16 w-16 text-primary/40" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl font-semibold">Ready to get started?</h2>
              <p className="text-muted-foreground text-lg">
                Generate your first set of personalized recommendations based on your profile, achievements, and projects.
              </p>
            </div>
            <Button size="lg" onClick={handleGenerate} className="px-8">
              Generate Recommendations
            </Button>
          </section>
        ) : (
          <div className="space-y-16">
            {/* Scholarship Section */}
            <section 
              ref={scholarRef}
              className={`space-y-6 transition-all duration-700 delay-100 ${scholarInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Top Scholarship Matches</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {scholarshipRecs.length > 0 ? scholarshipRecs.map((rec, idx) => (
                  <Card key={idx} className="group hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Link to="/scholarships" className="hover:underline">
                          <CardTitle className="text-lg line-clamp-2">{rec.scholarship_title}</CardTitle>
                        </Link>
                        <Badge variant="outline" className="ml-2">
                          Match
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Match Score</span>
                          <span className={`font-medium ${rec.match_score >= 80 ? 'text-green-600' : rec.match_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {rec.match_score}%
                          </span>
                        </div>
                        <Progress 
                          value={rec.match_score} 
                          className="h-2"
                          indicatorClassName={`${rec.match_score >= 80 ? 'bg-green-500' : rec.match_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {rec.reason}
                      </p>
                      <div className="bg-muted/50 p-3 rounded-md space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pro-tip</span>
                        <p className="text-xs italic leading-relaxed">{rec.action}</p>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Profile Section */}
              <section 
                ref={profileRef}
                className={`space-y-6 transition-all duration-700 delay-200 ${profileInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <Target className="h-6 w-6 text-secondary" />
                  </div>
                  <h2 className="text-2xl font-bold">Profile Completeness</h2>
                </div>

                <Card className="h-full">
                  <CardHeader className="flex flex-row items-center gap-6">
                    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          fill="transparent"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-muted/20"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          fill="transparent"
                          stroke="currentColor"
                          strokeWidth="8"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * (profileRec?.completeness_score || 0)) / 100}
                          className="text-primary transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <span className="absolute text-xl font-bold">{profileRec?.completeness_score || 0}%</span>
                    </div>
                    <div className="space-y-2">
                      <CardTitle>Analysis Results</CardTitle>
                      <CardDescription>
                        {profileRec?.missing_fields?.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {profileRec.missing_fields.map((field: string, idx: number) => (
                              <Badge key={idx} variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-none text-[10px] uppercase font-bold">
                                <AlertCircle className="w-3 h-3 mr-1" /> Missing: {field}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          "Your profile is looking great! See suggestions below for further refinement."
                        )}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <h3 className="font-semibold text-lg border-b pb-2">Improvement Suggestions</h3>
                    <div className="space-y-4">
                      {profileRec?.suggestions?.sort((a: any, b: any) => {
                        const priorities = { high: 0, medium: 1, low: 2 };
                        return priorities[a.priority as keyof typeof priorities] - priorities[b.priority as keyof typeof priorities];
                      }).map((s: ProfileSuggestion, idx: number) => (
                        <div key={idx} className="flex gap-4 items-start p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                          <Badge 
                            variant="secondary" 
                            className={`shrink-0 mt-0.5 ${
                              s.priority === 'high' ? 'bg-red-100 text-red-700' : 
                              s.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {s.priority}
                          </Badge>
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase">{s.area}</span>
                            <p className="text-sm leading-relaxed">{s.suggestion}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Action Items Section */}
              <section 
                ref={actionRef}
                className={`space-y-6 transition-all duration-700 delay-300 ${actionInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Zap className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold">Priority Action Items</h2>
                </div>

                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Next Steps</CardTitle>
                    <CardDescription>Actionable tasks to boost your scholarship eligibility.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {actionRecs.map((item, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:translate-x-1 ${
                            item.urgency === 'high' ? 'border-l-4 border-l-red-500 bg-red-50/30' : 
                            item.urgency === 'medium' ? 'border-l-4 border-l-yellow-500 bg-yellow-50/30' : 
                            'border-l-4 border-l-green-500 bg-green-50/30'
                          }`}
                        >
                          <div className="shrink-0">
                            {item.deadline_related ? (
                              <div className="p-2 bg-red-100 rounded-full">
                                <Bell className="h-4 w-4 text-red-600" />
                              </div>
                            ) : (
                              <div className="p-2 bg-muted rounded-full">
                                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="font-medium text-sm leading-tight">{item.action}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] h-4 uppercase">{item.category}</Badge>
                              {item.deadline_related && (
                                <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 uppercase">
                                  <Clock className="w-3 h-3" /> Time Sensitive
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Recommendations;
