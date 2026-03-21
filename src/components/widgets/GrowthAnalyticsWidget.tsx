import { useState, useEffect } from "react";
import { getProjects } from "@/lib/supabase/projects";
import { getAchievements } from "@/lib/supabase/achievements";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { TrendingUp, Award, Bot, Zap, BarChart3, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GrowthAnalyticsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
    userId?: string;
}

function StatCard({ icon, label, value, sublabel }: { 
    icon: React.ReactNode; 
    label: string; 
    value: string; 
    sublabel: string;
}) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-3xl font-bold mt-1">{value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function GrowthAnalyticsWidget({ className, defaultExpanded, userId }: GrowthAnalyticsWidgetProps) {
    const [analyticsData, setAnalyticsData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!userId) return;
            try {
                setLoading(true);
                
                const [projectsData, achievementsData] = await Promise.all([
                    getProjects(userId),
                    getAchievements(userId),
                ]);

                const totalProjects = projectsData?.length || 0;
                const completedProjects = projectsData?.filter(p => p.status === 'complete').length || 0;
                
                const data = {
                    projectCompletionRate: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0,
                    verifiedAchievementCount: achievementsData?.filter(a => a.verified).length || 0,
                    achievementCount: achievementsData?.length || 0,
                    aiUsage: [] as any[],
                    xp: {
                        level: 1,
                        currentXp: 0,
                        nextLevelXp: 1000,
                        tier: 'basic'
                    }
                };

                setAnalyticsData(data);
            } catch (err) {
                console.error("Failed to fetch analytics:", err);
                setError("Failed to load analytics");
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [userId]);

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'pro': return 'bg-gradient-to-r from-amber-400 to-yellow-600';
            case 'plus': return 'bg-gradient-to-r from-blue-400 to-indigo-600';
            default: return 'bg-gradient-to-r from-gray-400 to-gray-600';
        }
    };

    const getTierLabel = (tier: string) => {
        switch (tier) {
            case 'pro': return 'Pro';
            case 'plus': return 'Plus';
            default: return 'Basic';
        }
    };

    const xpPercentage = analyticsData 
        ? Math.min(100, (analyticsData.xp.currentXp / analyticsData.xp.nextLevelXp) * 100)
        : 0;

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-4">
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center text-sm text-destructive">
                    {error}
                </div>
            ) : analyticsData ? (
                <>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                            <span className="text-2xl font-bold">{analyticsData.projectCompletionRate}%</span>
                            <p className="text-xs text-muted-foreground">Completion</p>
                        </div>
                        <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                            <Award className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                            <span className="text-2xl font-bold">{analyticsData.verifiedAchievementCount}</span>
                            <p className="text-xs text-muted-foreground">Verified</p>
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-2">
                            <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-500" />
                                Level {analyticsData.xp.level}
                            </span>
                            <span className="text-muted-foreground">
                                {analyticsData.xp.currentXp}/{analyticsData.xp.nextLevelXp} XP
                            </span>
                        </div>
                        <Progress value={xpPercentage} className="h-2" />
                        <div className="mt-2 text-center">
                            <span className={`text-xs px-2 py-1 rounded-full text-white ${getTierColor(analyticsData.xp.tier)}`}>
                                {getTierLabel(analyticsData.xp.tier)} Plan
                            </span>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    No data available
                </div>
            )}
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col h-full gap-6">
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center text-destructive">
                    {error}
                </div>
            ) : analyticsData ? (
                <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                    <TabsList className="grid w-full max-w-md grid-cols-3 self-center md:self-start mb-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="xp">XP & Levels</TabsTrigger>
                        <TabsTrigger value="activity">Activity</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="flex-1 -mx-2 px-2">
                        <TabsContent value="overview" className="mt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-6">
                                <StatCard
                                    icon={<TrendingUp className="w-6 h-6 text-blue-500" />}
                                    label="Project Completion"
                                    value={`${analyticsData.projectCompletionRate}%`}
                                    sublabel="Of all projects"
                                />
                                <StatCard
                                    icon={<Award className="w-6 h-6 text-amber-500" />}
                                    label="Verified Achievements"
                                    value={`${analyticsData.verifiedAchievementCount}`}
                                    sublabel={`of ${analyticsData.achievementCount} total`}
                                />
                                <StatCard
                                    icon={<Bot className="w-6 h-6 text-purple-500" />}
                                    label="AI Messages"
                                    value="0"
                                    sublabel="Last 30 days"
                                />
                                <StatCard
                                    icon={<Zap className="w-6 h-6 text-amber-500" />}
                                    label="Current XP"
                                    value={`${analyticsData.xp.currentXp}`}
                                    sublabel={`Level ${analyticsData.xp.level}`}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="xp" className="mt-0">
                            <Card className="max-w-md">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white ${getTierColor(analyticsData.xp.tier)}`}>
                                                {analyticsData.xp.level}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold">Level {analyticsData.xp.level}</h3>
                                                <p className="text-sm text-muted-foreground">{getTierLabel(analyticsData.xp.tier)} Plan</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>XP Progress</span>
                                            <span>{analyticsData.xp.currentXp} / {analyticsData.xp.nextLevelXp}</span>
                                        </div>
                                        <Progress value={xpPercentage} className="h-3" />
                                        <p className="text-xs text-muted-foreground text-center">
                                            {analyticsData.xp.nextLevelXp - analyticsData.xp.currentXp} XP to next level
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="activity" className="mt-0">
                            <div className="text-center py-12 text-muted-foreground">
                                No AI activity yet. Start chatting with SmartBuddy!
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    No analytics data available
                </div>
            )}
        </div>
    );

    return (
        <ExpandableWidget
            title="Growth Analytics"
            icon={<BarChart3 className="w-5 h-5 text-green-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
