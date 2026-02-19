import { Card, CardContent } from "@/components/ui/card";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { TrendingUp, BookOpen, Clock, Award, Star, Activity } from "lucide-react";

interface ParentStatsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
    studentData: any; // Using any for now as strict typing might be complex with the current profile/student structure
}

export function ParentStatsWidget({ className, defaultExpanded, studentData }: ParentStatsWidgetProps) {
    if (!studentData) return null;

    const stats = [
        { icon: BookOpen, label: "Current Grade", value: studentData.grade || 'N/A', color: "text-blue-500", bg: "bg-blue-500/10" },
        { icon: TrendingUp, label: "GPA", value: studentData.gpa || 'N/A', color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { icon: Clock, label: "Attendance", value: "98%", color: "text-purple-500", bg: "bg-purple-500/10" }, // Mock data
        { icon: Star, label: "Growth Score", value: "850", color: "text-amber-500", bg: "bg-amber-500/10" }, // Mock data
    ];

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-4">
            <div className="grid grid-cols-2 gap-3">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                            <div className={`p-2 rounded-md ${stat.bg}`}>
                                <Icon className={`w-4 h-4 ${stat.color}`} />
                            </div>
                            <div>
                                <div className="text-lg font-bold leading-none">{stat.value}</div>
                                <div className="text-xs text-muted-foreground">{stat.label}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-auto pt-2 border-t text-sm text-center text-muted-foreground">
                Last updated: Just now
            </div>
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col gap-6 p-2">
            <div className="grid md:grid-cols-4 gap-4">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={i}>
                            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                                <div className={`p-4 rounded-full ${stat.bg} mb-2`}>
                                    <Icon className={`w-8 h-8 ${stat.color}`} />
                                </div>
                                <div>
                                    <div className="text-3xl font-bold">{stat.value}</div>
                                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Academic Performance
                    </h3>
                    <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg border border-dashed">
                        {/* Placeholder for a real chart */}
                        <p className="text-muted-foreground">Performance chart will be available once enough data is collected.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Teacher Comments</h3>
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-muted/50">
                            <p className="italic text-sm">"{studentData.full_name?.split(' ')[0]} is doing excellent work in Mathematics. Keep it up!"</p>
                            <p className="text-xs text-muted-foreground mt-2 text-right">- Mr. Anderson, Math Teacher</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    return (
        <ExpandableWidget
            title="Academic Overview"
            icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
