import { useState, useEffect, useCallback } from "react";
import { getChildAchievements } from "@/lib/supabase/parent";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Award, CheckCircle, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AchievementsMonitoringWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
    childId: string | number;
}

type AchievementItem = {
    id: string;
    title: string;
    description: string | null;
    category: string;
    verified: boolean;
    certificate_url: string | null;
    date_earned: string | null;
    created_at: string;
};

const CATEGORY_OPTIONS = ["all", "academic", "sports", "leadership", "arts", "other"];

const CATEGORY_COLORS: Record<string, string> = {
    academic: "bg-blue-500/10 text-blue-700",
    sports: "bg-emerald-500/10 text-emerald-700",
    leadership: "bg-purple-500/10 text-purple-700",
    arts: "bg-pink-500/10 text-pink-700",
    other: "bg-muted text-muted-foreground",
};

export function AchievementsMonitoringWidget({ className, defaultExpanded, childId }: AchievementsMonitoringWidgetProps) {
    const [achievements, setAchievements] = useState<AchievementItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [category, setCategory] = useState("all");
    const [previewCert, setPreviewCert] = useState<string | null>(null);

    const fetchAchievements = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params: { category?: string } = {};
            if (category !== "all") params.category = category;
            const res = await parentApi.getChildAchievements(childId, params);
            setAchievements(res.data || []);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to load achievements.");
        } finally {
            setLoading(false);
        }
    }, [childId, category]);

    useEffect(() => { fetchAchievements(); }, [fetchAchievements]);

    const verified = achievements.filter(a => a.verified);

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-3">
            {loading ? <Skeleton className="h-16 w-full" /> : error ? <p className="text-sm text-destructive">{error}</p> : (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-amber-500/10 text-center">
                            <div className="text-xl font-bold text-amber-600">{achievements.length}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-500/10 text-center">
                            <div className="text-xl font-bold text-emerald-600">{verified.length}</div>
                            <div className="text-xs text-muted-foreground">Verified</div>
                        </div>
                    </div>
                    {achievements[0] && (
                        <div className="text-xs text-muted-foreground border-t pt-2 truncate">
                            Latest: <span className="font-medium">{achievements[0].title}</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col gap-4 p-2">
            <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CATEGORY_OPTIONS.map(c => (
                            <SelectItem key={c} value={c} className="capitalize">{c === "all" ? "All categories" : c}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : error ? (
                <div className="text-center py-8 text-destructive">{error}<button onClick={fetchAchievements} className="block mt-2 mx-auto text-sm text-primary underline">Retry</button></div>
            ) : achievements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Award className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No achievements{category !== "all" ? ` in ${category}` : ""} yet</p>
                </div>
            ) : (
                <>
                    {/* Certificate preview modal */}
                    {previewCert && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewCert(null)}>
                            <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                                <div className="p-4 border-b flex justify-between items-center">
                                    <span className="font-semibold">Certificate Preview</span>
                                    <button onClick={() => setPreviewCert(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                                </div>
                                <img src={previewCert} alt="Certificate" className="w-full" />
                                <div className="p-4">
                                    <a href={previewCert} download className="text-sm text-primary underline">Download Certificate</a>
                                </div>
                            </div>
                        </div>
                    )}

                    <ScrollArea className="max-h-[400px]">
                        <div className="space-y-3 pr-2">
                            {achievements.map(achievement => (
                                <div key={achievement.id} className="p-4 rounded-xl border bg-card flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                                        <Award className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 flex-wrap">
                                            <h4 className="font-semibold">{achievement.title}</h4>
                                            <div className="flex gap-1 flex-shrink-0">
                                                {achievement.verified && (
                                                    <Badge variant="secondary" className="text-[10px] h-5">
                                                        <CheckCircle className="w-3 h-3 mr-1 text-emerald-500" />Verified
                                                    </Badge>
                                                )}
                                                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[achievement.category] || CATEGORY_COLORS.other}`}>
                                                    {achievement.category}
                                                </span>
                                            </div>
                                        </div>
                                        {achievement.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{achievement.description}</p>}
                                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                            {achievement.date_earned && <span>Earned {new Date(achievement.date_earned).toLocaleDateString()}</span>}
                                            {achievement.certificate_url && (
                                                <button onClick={() => setPreviewCert(achievement.certificate_url!)} className="text-primary hover:underline">
                                                    View Certificate
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </>
            )}
        </div>
    );

    return (
        <ExpandableWidget
            title="Achievements"
            icon={<Award className="w-5 h-5 text-amber-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
