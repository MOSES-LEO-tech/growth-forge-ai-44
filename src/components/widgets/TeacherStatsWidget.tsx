import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Activity, TrendingUp, Users } from "lucide-react";

interface TeacherStatsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

export function TeacherStatsWidget({ className, defaultExpanded }: TeacherStatsWidgetProps) {

    // Mock Data for charts
    const stats = [
        { label: "Avg Growth Score", value: "785", change: "+12%", trend: "up" },
        { label: "Active Project", value: "34", change: "+5", trend: "up" },
        { label: "Achievements", value: "156", change: "+23", trend: "up" },
    ];

    const CollapsedContent = () => (
        <div className="flex flex-col h-full justify-center space-y-4">
            {stats.map((stat, i) => (
                <div key={i} className="flex justify-between items-center px-2">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <div className="flex items-center gap-2">
                        <span className="font-bold">{stat.value}</span>
                        <span className="text-xs text-green-600 bg-green-50 px-1 rounded">{stat.change}</span>
                    </div>
                </div>
            ))}
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col h-full gap-6">
            <div>
                <h3 className="text-lg font-semibold">Class Performance</h3>
                <p className="text-sm text-muted-foreground">Analytics and insights</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((stat, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.label}
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">
                                <span className="text-green-500 font-medium">{stat.change}</span> from last month
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Tabs defaultValue="engagement" className="flex-1">
                <TabsList>
                    <TabsTrigger value="engagement">Engagement</TabsTrigger>
                    <TabsTrigger value="growth">Growth Growth</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="engagement" className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/20 mt-4">
                    <div className="text-center text-muted-foreground">
                        <BarChart className="w-16 h-16 mx-auto mb-2 opacity-20" />
                        <p>Engagement Chart Placeholder</p>
                        <p className="text-xs">(Recharts or similar library needed for real charts)</p>
                    </div>
                </TabsContent>
                <TabsContent value="growth" className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/20 mt-4">
                    <div className="text-center text-muted-foreground">
                        <TrendingUp className="w-16 h-16 mx-auto mb-2 opacity-20" />
                        <p>Growth Trajectory Placeholder</p>
                    </div>
                </TabsContent>
                <TabsContent value="activity" className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/20 mt-4">
                    <div className="text-center text-muted-foreground">
                        <Activity className="w-16 h-16 mx-auto mb-2 opacity-20" />
                        <p>Activity Log Placeholder</p>
                    </div>
                </TabsContent>
            </Tabs>
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
