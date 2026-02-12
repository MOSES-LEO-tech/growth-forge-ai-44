import { useState, useEffect } from "react";
import { dashboard } from "@/services/api";
import type { Achievement } from "@/services/api";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Award, Search, Filter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AchievementsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

export function AchievementsWidget({ className, defaultExpanded }: AchievementsWidgetProps) {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchAchievements = async () => {
            try {
                const response = await dashboard.getAchievements();
                setAchievements(response.data || []);
            } catch (error) {
                console.error("Failed to fetch achievements:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAchievements();
    }, []);

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-4">
            {achievements.length > 0 ? (
                <div className="space-y-3">
                    {achievements.slice(0, 3).map((achievement) => (
                        <div key={achievement.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50 text-sm">
                            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center flex-shrink-0">
                                <Award className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate">{achievement.title}</div>
                                <div className="text-xs text-muted-foreground">{new Date(achievement.date_earned).toLocaleDateString()}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <Award className="w-12 h-12 opacity-20 mb-2" />
                    <p className="text-sm">No achievements yet</p>
                </div>
            )}

            {achievements.length > 0 && (
                <div className="mt-auto text-xs text-center text-muted-foreground pt-2 border-t">
                    Total Earned: <strong>{achievements.length}</strong>
                </div>
            )}
        </div>
    );

    const ExpandedContent = () => {
        const filtered = achievements.filter(a =>
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div className="flex flex-col h-full gap-6">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search achievements..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">No achievements found.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                            {filtered.map((achievement) => (
                                <div key={achievement.id} className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <Award className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="font-semibold text-lg leading-tight">{achievement.title}</h4>
                                            {achievement.verified && (
                                                <Badge variant="secondary" className="flex-shrink-0 text-[10px] h-5">Verified</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{achievement.description}</p>
                                        <div className="mt-3 flex items-center text-xs text-muted-foreground">
                                            <span className="bg-secondary/50 px-2 py-0.5 rounded">
                                                Earned on {new Date(achievement.date_earned).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        );
    };

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
