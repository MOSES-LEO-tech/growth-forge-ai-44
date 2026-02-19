import { useState, useEffect, useCallback } from "react";
import { parent as parentApi } from "@/services/api";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { TrendingUp, BookOpen, Award, Zap, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
    childId: string | number;
}

type AnalyticsData = {
    projectCompletionRate: number;
    projectsTotal: number;
    projectsCompleted: number;
    achievements: {
        total: number;
        verified: number;
        byCategory: { academic: number; sports: number; leadership: number; arts: number };
    };
    activityTrend: { day: string; activity_count: number }[];
    xp: { tier: string; level: number; currentXp: number; nextLevelXp: number };
};

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100);
    return (
        <div>
            <div className="flex justify-between text-xs mb-1">
                <span className="capitalize text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: 'width 0.6s ease' }} />
            </div>
        </div>
    );
}

export function AnalyticsWidget({ className, defaultExpanded, childId }: AnalyticsWidgetProps) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await parentApi.getChildAnalytics(childId);
            setData(res.data);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to load analytics.");
        } finally {
            setLoading(false);
        }
    }, [childId]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-3">
            {loading ? <Skeleton className="h-16 w-full" /> : error ? <p className="text-sm text-destructive">{error}</p> : data ? (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-purple-500/10 text-center">
                            <div className="text-xl font-bold text-purple-600">{data.projectCompletionRate}%</div>
                            <div className="text-xs text-muted-foreground">Completion Rate</div>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-500/10 text-center">
                            <div className="text-xl font-bold text-emerald-600">{data.xp.level}</div>
                            <div className="text-xs text-muted-foreground">Level</div>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col gap-6 p-2">
            {loading ? (
                <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : error ? (
                <div className="text-center py-8 text-destructive">{error}<button onClick={fetchAnalytics} className="block mt-2 mx-auto text-sm text-primary underline">Retry</button></div>
            ) : data ? (
                <>
                    {/* Key metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: BookOpen, label: "Completion", value: `${data.projectCompletionRate}%`, sub: `${data.projectsCompleted}/${data.projectsTotal} projects`, color: "text-blue-500 bg-blue-500/10" },
                            { icon: Award, label: "Verified", value: `${data.achievements.total > 0 ? Math.round((data.achievements.verified / data.achievements.total) * 100) : 0}%`, sub: `${data.achievements.verified} of ${data.achievements.total}`, color: "text-amber-500 bg-amber-500/10" },
                            { icon: Zap, label: "XP Level", value: data.xp.level, sub: `${data.xp.currentXp}/${data.xp.nextLevelXp} XP`, color: "text-purple-500 bg-purple-500/10" },
                            { icon: Activity, label: "Active Days", value: data.activityTrend.length, sub: "last 60 days", color: "text-emerald-500 bg-emerald-500/10" },
                        ].map(({ icon: Icon, label, value, sub, color }) => (
                            <div key={label} className="p-4 rounded-xl border bg-card text-center">
                                <div className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center mb-2 ${color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="text-xl font-bold">{value}</div>
                                <div className="text-xs font-medium">{label}</div>
                                <div className="text-xs text-muted-foreground">{sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* XP progress bar */}
                    <div>
                        <h4 className="font-semibold text-sm mb-3">XP Progress — Level {data.xp.level}</h4>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-500"
                                style={{
                                    width: `${data.xp.nextLevelXp > 0 ? Math.min(100, (data.xp.currentXp / data.xp.nextLevelXp) * 100) : 100}%`,
                                    transition: 'width 0.8s ease',
                                }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{data.xp.currentXp} XP</span>
                            <span>{data.xp.nextLevelXp} XP</span>
                        </div>
                    </div>

                    {/* Achievements by category */}
                    <div>
                        <h4 className="font-semibold text-sm mb-3">Achievements by Category</h4>
                        <div className="space-y-2">
                            {Object.entries(data.achievements.byCategory).map(([cat, val]) => (
                                <MiniBar
                                    key={cat}
                                    label={cat}
                                    value={val}
                                    max={data.achievements.total || 1}
                                    color={cat === 'academic' ? 'bg-blue-500' : cat === 'sports' ? 'bg-emerald-500' : cat === 'leadership' ? 'bg-purple-500' : 'bg-pink-500'}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Activity heatmap (simple grid) */}
                    {data.activityTrend.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-sm mb-3">Activity (last 60 days)</h4>
                            <div className="flex flex-wrap gap-1">
                                {data.activityTrend.slice(-42).map((d, i) => (
                                    <div
                                        key={i}
                                        title={`${d.day}: ${d.activity_count} activities`}
                                        className={`w-4 h-4 rounded-sm ${d.activity_count >= 3 ? 'bg-emerald-500' : d.activity_count === 2 ? 'bg-emerald-400/60' : 'bg-emerald-300/40'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );

    return (
        <ExpandableWidget
            title="Growth Analytics"
            icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
