import { useState, useEffect, useCallback } from "react";
import { getChildOverview } from "@/lib/supabase/parent";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Users, School, BookOpen, Award, Star, Activity, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ChildOverviewWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
    childId: string | number;
    childName: string;
}

type OverviewData = {
    student: { id: string; fullName: string; email: string; avatarUrl?: string; grade?: string; school?: { name: string; location?: string } | null };
    stats: { projectsCount: number; projectsCompleted: number; achievementsCount: number; verifiedAchievementsCount: number; level: string; points: number };
    recentActivity: { type: string; label: string; status_text: string; created_at: string }[];
};

export function ChildOverviewWidget({ className, defaultExpanded, childId, childName }: ChildOverviewWidgetProps) {
    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOverview = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await getChildOverview(String(childId));
            setData(result as OverviewData);
        } catch (err: any) {
            setError(err?.message || "Failed to load overview.");
        } finally {
            setLoading(false);
        }
    }, [childId]);

    useEffect(() => { fetchOverview(); }, [fetchOverview]);

    const completionPct = data
        ? data.stats.projectsCount === 0 ? 0 : Math.round((data.stats.projectsCompleted / data.stats.projectsCount) * 100)
        : 0;

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-3">
            {loading ? (
                <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
            ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
            ) : data ? (
                <>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={data.student.avatarUrl} />
                            <AvatarFallback>{data.student.fullName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-semibold">{data.student.fullName}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <School className="w-3 h-3" />
                                {data.student.school?.name || "No school linked"}
                                {data.student.grade && <span>· Grade {data.student.grade}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                        {[
                            { icon: BookOpen, label: "Projects", value: data.stats.projectsCount, color: "text-blue-500" },
                            { icon: Award, label: "Achievements", value: data.stats.achievementsCount, color: "text-amber-500" },
                            { icon: CheckCircle, label: "Verified", value: data.stats.verifiedAchievementsCount, color: "text-emerald-500" },
                        ].map(({ icon: Icon, label, value, color }) => (
                            <div key={label} className="text-center p-2 rounded-lg bg-muted/50">
                                <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                                <div className="text-base font-bold">{value}</div>
                                <div className="text-[10px] text-muted-foreground">{label}</div>
                            </div>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col gap-6 p-2">
            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : error ? (
                <div className="text-center py-8 text-destructive">
                    <p>{error}</p>
                    <button onClick={fetchOverview} className="mt-2 text-sm text-primary underline">Retry</button>
                </div>
            ) : data ? (
                <>
                    <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={data.student.avatarUrl} />
                            <AvatarFallback className="text-xl">{data.student.fullName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold">{data.student.fullName}</h3>
                            <div className="text-sm text-muted-foreground flex gap-3 mt-1">
                                {data.student.school && <span className="flex items-center gap-1"><School className="w-3.5 h-3.5" />{data.student.school.name}</span>}
                                {data.student.grade && <span>Grade {data.student.grade}</span>}
                            </div>
                            <div className="mt-2 flex gap-2">
                                <Badge variant="outline" className="capitalize">{data.stats.level} plan</Badge>
                                <Badge variant="secondary">{data.stats.points} XP</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: BookOpen, label: "Projects", value: data.stats.projectsCount, sub: `${data.stats.projectsCompleted} completed`, color: "text-blue-500 bg-blue-500/10" },
                            { icon: Award, label: "Achievements", value: data.stats.achievementsCount, sub: `${data.stats.verifiedAchievementsCount} verified`, color: "text-amber-500 bg-amber-500/10" },
                            { icon: TrendingUp, label: "Completion", value: `${completionPct}%`, sub: "of projects", color: "text-purple-500 bg-purple-500/10" },
                            { icon: Star, label: "XP Points", value: data.stats.points, sub: data.stats.level, color: "text-emerald-500 bg-emerald-500/10" },
                        ].map(({ icon: Icon, label, value, sub, color }) => (
                            <div key={label} className="p-4 rounded-xl border bg-card text-center">
                                <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="text-2xl font-bold">{value}</div>
                                <div className="text-xs font-medium">{label}</div>
                                <div className="text-xs text-muted-foreground">{sub}</div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Recent Activity</h4>
                        {data.recentActivity.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No recent activity yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {data.recentActivity.map((item, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 text-sm">
                                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.type === 'achievement' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <span className="truncate font-medium">{item.label}</span>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3" />
                                                {new Date(item.created_at).toLocaleDateString()}
                                                <Badge variant="outline" className="text-[9px] h-4 ml-1 capitalize">{item.status_text}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : null}
        </div>
    );

    return (
        <ExpandableWidget
            title={`${childName}'s Overview`}
            icon={<Users className="w-5 h-5 text-blue-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
