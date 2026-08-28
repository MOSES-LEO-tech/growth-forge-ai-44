import { useState, useEffect } from "react";
import { getTeacherAnalytics } from "@/lib/supabase/teacher";
import { useAuth } from "@/contexts/AuthContext";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Activity, TrendingUp, Users, Loader2, FileText, Trophy } from "lucide-react";

interface TeacherStatsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

interface AnalyticsData {
    totalStudents: number;
    totalClasses: number;
    pendingProjects: number;
    pendingAchievements: number;
    averageCompletionRate: number;
    recentActivity: Array<{
        type: string;
        id: string;
        title: string;
        student_name: string;
        created_at: string;
    }>;
}

export function TeacherStatsWidget({ className, defaultExpanded }: TeacherStatsWidgetProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const data = await getTeacherAnalytics(user.id);
                setAnalytics(data);
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [user]);

    // Transform analytics to stats
    const stats = analytics ? [
        { label: "Total Students", value: analytics.totalStudents, icon: Users, color: "text-blue-500" },
        { label: "Pending Projects", value: analytics.pendingProjects, icon: FileText, color: "text-amber-500" },
        { label: "Pending Achievements", value: analytics.pendingAchievements, icon: Trophy, color: "text-green-500" },
    ] : [
        { label: "Total Students", value: "-", icon: Users, color: "text-blue-500" },
        { label: "Pending Projects", value: "-", icon: FileText, color: "text-amber-500" },
        { label: "Pending Achievements", value: "-", icon: Trophy, color: "text-green-500" },
    ];

    const CollapsedContent = () => (
        <div className="flex flex-col h-full justify-center space-y-4">
            {loading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                stats.map((stat, i) => (
                    <div key={i} className="flex justify-between items-center px-2">
                        <span className="text-sm text-muted-foreground">{stat.label}</span>
                        <div className="flex items-center gap-2">
                            <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            <span className="font-bold">{stat.value}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col h-full gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Class Performance</h3>
                    <p className="text-sm text-muted-foreground">Analytics and insights</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    Refresh
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Students
                                </CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{analytics?.totalStudents || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    Across {analytics?.totalClasses || 0} classes
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Project Completion
                                </CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{analytics?.averageCompletionRate || 0}%</div>
                                <p className="text-xs text-muted-foreground">
                                    Average completion rate
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Pending Approvals
                                </CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {(analytics?.pendingProjects || 0) + (analytics?.pendingAchievements || 0)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {analytics?.pendingProjects || 0} projects, {analytics?.pendingAchievements || 0} achievements
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="activity" className="flex-1">
                        <TabsList>
                            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                        </TabsList>
                        <TabsContent value="activity" className="h-[300px] overflow-auto border rounded-lg bg-muted/20 mt-4 p-4">
                            {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
                                <div className="space-y-3">
                                    {analytics.recentActivity.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded bg-background">
                                            {item.type === 'project' ? (
                                                <FileText className="w-4 h-4 text-blue-500" />
                                            ) : (
                                                <Trophy className="w-4 h-4 text-amber-500" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{item.title}</p>
                                                <p className="text-xs text-muted-foreground">by {item.student_name}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-12">
                                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>No recent activity</p>
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="overview" className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/20 mt-4">
                            <div className="text-center text-muted-foreground">
                                <BarChart className="w-16 h-16 mx-auto mb-2 opacity-20" />
                                <p>Overview Chart Placeholder</p>
                                <p className="text-xs">(Charts can be added with a charting library)</p>
                            </div>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );

    return (
        <ExpandableWidget
            title="Class Statistics"
            icon={<Activity className="w-5 h-5 text-indigo-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
