import { RefreshCcw, AlertCircle, CheckCircle2, Trophy, Target, Compass, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRecommendations, useRefreshRecommendations } from "@/hooks/useRecommendations";
import { cn } from "@/lib/utils";

const Recommendations = () => {
  const { data, isLoading, isError, error, refetch } = useRecommendations();
  const refreshMutation = useRefreshRecommendations();

  const handleRefresh = async () => {
    await refreshMutation.mutateAsync();
  };

  const isRefreshing = refreshMutation.isPending;

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-grow pt-24 pb-16 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md px-4">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Guidance Unavailable</h2>
            <p className="text-slate-500">
              {error instanceof Error ? error.message : "We encountered an error while generating your personalized recommendations. Please try again later."}
            </p>
            <Button onClick={() => refetch()} variant="outline" className="mt-4">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Compass className="w-8 h-8 text-primary" />
                Guidance
              </h1>
              <p className="text-slate-500 font-medium">
                Personalized insights and opportunities based on your Milestone profile.
              </p>
            </div>
            <Button 
              onClick={handleRefresh} 
              disabled={isLoading || isRefreshing}
              variant="outline"
              className="bg-white shadow-sm border-slate-200"
            >
              <RefreshCcw className={cn("w-4 h-4 mr-2", (isLoading || isRefreshing) && "animate-spin")} />
              {isRefreshing ? "Analyzing..." : "Refresh Insights"}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Profile Completeness & Action Items */}
            <div className="lg:col-span-1 space-y-8">
              {/* Profile Completeness Gauge */}
              <Card className="border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <UserCircle className="w-5 h-5 text-primary" />
                    Profile Completeness
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-32 w-32 rounded-full mx-auto" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="relative flex items-center justify-center py-4">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle
                            className="text-slate-100"
                            strokeWidth="8"
                            stroke="currentColor"
                            fill="transparent"
                            r="58"
                            cx="64"
                            cy="64"
                          />
                          <circle
                            className="text-primary transition-all duration-1000 ease-out"
                            strokeWidth="8"
                            strokeDasharray={364}
                            strokeDashoffset={364 - (364 * (data?.profile_completeness || 0)) / 100}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="58"
                            cx="64"
                            cy="64"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-black text-slate-900">{data?.profile_completeness}%</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Missing Fields</h4>
                        <div className="flex flex-wrap gap-2">
                          {data?.missing_profile_fields.map((field) => (
                            <Badge key={field} variant="secondary" className="bg-amber-50 text-amber-700 border-amber-100 py-1 px-3">
                              {field.replace('_', ' ')}
                            </Badge>
                          ))}
                          {data?.missing_profile_fields.length === 0 && (
                            <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                              <CheckCircle2 className="w-4 h-4" />
                              Profile is fully complete!
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Action Items List */}
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Priority Action Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
                  ) : (
                    data?.action_items.map((item, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-50 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-2 group">
                        <div className="flex items-center justify-between">
                          <Badge 
                            className={cn(
                              "text-[10px] uppercase font-bold px-2 py-0.5 border-none",
                              item.priority === 'high' ? "bg-red-100 text-red-700" :
                              item.priority === 'medium' ? "bg-amber-100 text-amber-700" :
                              "bg-blue-100 text-blue-700"
                            )}
                          >
                            {item.priority}
                          </Badge>
                        </div>
                        <h5 className="font-bold text-slate-900 group-hover:text-primary transition-colors leading-tight">
                          {item.title}
                        </h5>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Scholarship Matches */}
            <div className="lg:col-span-2">
              <Card className="border-none shadow-sm bg-white h-full">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-6 mb-6">
                  <div>
                    <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-amber-500" />
                      Scholarship Matches
                    </CardTitle>
                    <CardDescription className="text-slate-500 mt-1">
                      Based on your GPA, interests, and current grade level.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading ? (
                    [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
                  ) : (
                    data?.scholarship_matches.sort((a, b) => b.match_score - a.match_score).map((match) => (
                      <div key={match.scholarship_id} className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg hover:border-primary/20 transition-all duration-300 group">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="space-y-3 flex-grow">
                            <div className="flex items-center gap-3">
                              <h4 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                                {match.title}
                              </h4>
                              <Badge 
                                className={cn(
                                  "font-bold px-3 py-1 rounded-full border-none",
                                  match.match_score >= 80 ? "bg-emerald-50 text-emerald-700" :
                                  match.match_score >= 50 ? "bg-amber-50 text-amber-700" :
                                  "bg-red-50 text-red-700"
                                )}
                              >
                                {match.match_score}% Match
                              </Badge>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">
                              <span className="font-semibold text-slate-900">Why this matches:</span> {match.reason}
                            </p>
                            <div className="pt-2">
                              <Button variant="ghost" className="p-0 h-auto text-primary hover:text-primary/80 font-semibold text-sm">
                                View Scholarship Details →
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {!isLoading && data?.scholarship_matches.length === 0 && (
                    <div className="text-center py-12">
                      <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-8 h-8 text-slate-300" />
                      </div>
                      <h4 className="text-xl font-bold text-slate-900">No Scholarship Matches Yet</h4>
                      <p className="text-slate-500 max-w-sm mx-auto mt-2">
                        Complete more of your profile and add projects to unlock scholarship matching.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Recommendations;
