import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Trophy, Target, Zap, ChevronRight, CheckCircle, ExternalLink } from 'lucide-react';
import { getRecommendations } from '@/lib/supabase/recommendations';
import { useInView } from '@/hooks/useInView';
import type { Recommendation } from '@/integrations/supabase/types';

interface Scholarship {
  id: number;
  title: string;
  description: string | null;
  amount: number | null;
  score: number;
  matchedCriteria: string[];
  missingCriteria: string[];
  deadline: Date | null;
  providerName: string | null;
  applicationUrl: string | null;
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

interface ProfileCompleteness {
  overall: number;
  sections: {
    name: string;
    completed: boolean;
    score: number;
  }[];
  suggestions: string[];
}

const Recommendations = () => {
  const { user } = useAuth();
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [completeness, setCompleteness] = useState<any | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { ref: heroRef, isInView: heroInView } = useInView({ threshold: 0.2 });
  const { ref: scholarRef, isInView: scholarInView } = useInView({ threshold: 0.2 });
  const { ref: actionRef, isInView: actionInView } = useInView({ threshold: 0.2 });

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const data = await getRecommendations(user.id);
        
        // Map unified recommendations to separate state buckets
        const scholarshipRecs = data.filter(r => r.type === 'scholarship').map(r => r.content);
        const actionRecs = data.filter(r => r.type === 'actions').map(r => r.content);
        const profileRecs = data.find(r => r.type === 'profile')?.content;

        setScholarships(scholarshipRecs);
        setActions(actionRecs);
        setCompleteness(profileRecs?.completeness || null);
        setSkills(profileRecs?.skills || []);
      } catch (err: any) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [user]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading recommendations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

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
              Your
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Recommendations</span>
              <span className="ml-3">📋</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Personalized scholarship matches and action items to help you achieve your goals.
            </p>
          </div>
        </div>
      </section>

      {/* Profile Completeness */}
      {completeness && (
        <section className="py-8 bg-muted/30">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-6 h-6 text-primary" />
                  Profile Completeness
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 mb-6">
                  <div className="relative w-32 h-32">
                    <svg className="transform -rotate-90 w-32 h-32">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        className="text-muted"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray={`${completeness.overall * 3.52} 352`}
                        className="text-primary"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold">{completeness.overall}%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="space-y-3">
                      {completeness.sections.map((section, index) => (
                        <div key={index} className="flex items-center gap-3">
                          {section.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">{section.name}</span>
                              <span className="text-sm text-muted-foreground">{section.score}%</span>
                            </div>
                            <Progress value={section.score} className="h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {completeness.suggestions.length > 0 && (
                  <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                    <h4 className="font-semibold mb-2">Suggestions:</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {completeness.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Scholarship Matches */}
      <section ref={scholarRef} className={`py-16 transition-all duration-1000 ${scholarInView ? 'opacity-100' : 'opacity-0'}`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="w-8 h-8 text-primary" />
            <h2 className="text-4xl font-bold">Scholarship Matches</h2>
          </div>

          {scholarships.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scholarships.map((scholarship, index) => (
                <Card
                  key={scholarship.id}
                  className={`hover:shadow-lg transition-all duration-300 ${
                    scholarship.score >= 80 ? 'border-green-500 border-2' : ''
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{scholarship.title}</CardTitle>
                      <span className={`text-2xl font-bold ${getScoreColor(scholarship.score)}`}>
                        {scholarship.score}%
                      </span>
                    </div>
                    {scholarship.providerName && (
                      <p className="text-sm text-muted-foreground">{scholarship.providerName}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {scholarship.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {scholarship.description}
                      </p>
                    )}
                    {scholarship.amount && (
                      <p className="font-semibold text-green-600 mb-4">
                        ${scholarship.amount.toLocaleString()}
                      </p>
                    )}
                    <div className="space-y-2 mb-4">
                      {scholarship.matchedCriteria.slice(0, 2).map((criteria, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>{criteria}</span>
                        </div>
                      ))}
                      {scholarship.missingCriteria.slice(0, 2).map((criteria, index) => (
                        <div key={`missing-${index}`} className="flex items-center gap-2 text-sm text-red-500">
                          <span>⚠️</span>
                          <span>{criteria}</span>
                        </div>
                      ))}
                    </div>
                    {scholarship.applicationUrl && (
                      <Button className="w-full" asChild>
                        <a href={scholarship.applicationUrl} target="_blank" rel="noopener noreferrer">
                          Apply Now
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Scholarships Found</h3>
                <p className="text-muted-foreground">
                  Complete your profile to get personalized scholarship matches.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Action Items */}
      <section ref={actionRef} className={`py-16 bg-muted/30 transition-all duration-1000 ${actionInView ? 'opacity-100' : 'opacity-0'}`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="w-8 h-8 text-yellow-500" />
            <h2 className="text-4xl font-bold">Action Items</h2>
          </div>

          {actions.length > 0 ? (
            <div className="max-w-2xl mx-auto space-y-4">
              {actions.map((action, index) => (
                <Card
                  key={action.id}
                  className={`hover:shadow-md transition-all duration-300 ${
                    actionInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className={`p-2 rounded-lg ${getPriorityColor(action.priority)}`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{action.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{action.description}</p>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {action.category}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12 max-w-2xl mx-auto">
              <CardContent>
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">
                  Great job! You've completed all recommended actions.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Recommended Skills */}
      {skills.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Skills That Scholarship Providers Look For</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default Recommendations;
