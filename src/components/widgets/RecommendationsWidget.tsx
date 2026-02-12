import { useState } from "react";
import { recommendations } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Sparkles, TrendingUp, RefreshCw } from "lucide-react";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Recommendation {
    title: string;
    description: string;
    category: 'project' | 'skill' | 'activity';
    priority: 'high' | 'medium' | 'low';
}

interface RecommendationsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

export function RecommendationsWidget({ className, defaultExpanded }: RecommendationsWidgetProps) {
    const [matches, setMatches] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const generateRecommendations = async (showToast = true) => {
        setLoading(true);
        try {
            const response = await recommendations.generate();
            const data = response.data;
            setMatches(data.recommendations);
            if (showToast) {
                toast({
                    title: "Recommendations generated",
                    description: "Here are personalized suggestions for you!",
                });
            }
        } catch (error) {
            console.error('Error generating recommendations:', error);
            if (showToast) {
                toast({
                    title: "Error",
                    description: "Failed to generate recommendations. Please try again.",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const onExpand = (expanded: boolean) => {
        if (expanded && matches.length === 0 && !loading) {
            generateRecommendations(false);
        }
    }

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'project': return <TrendingUp className="w-4 h-4" />;
            case 'skill': return <Sparkles className="w-4 h-4" />;
            case 'activity': return <Lightbulb className="w-4 h-4" />;
            default: return <Lightbulb className="w-4 h-4" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'default';
            case 'medium': return 'secondary';
            case 'low': return 'outline';
            default: return 'outline';
        }
    };

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-4">
            <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
                <Sparkles className="w-8 h-8 text-amber-500 mb-2 opacity-80" />
                <p className="text-sm font-medium">Get AI Suggestions</p>
                <p className="text-xs text-muted-foreground mt-1">
                    {matches.length > 0 ? `${matches.length} fresh ideas for you` : "Unlock your next step"}
                </p>
            </div>
            <Button size="sm" variant="outline" className="w-full mt-auto" onClick={(e) => { e.stopPropagation(); generateRecommendations(); }}>
                {loading ? "Thinking..." : "Generate"}
            </Button>
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col h-full gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Personalized Recommendations</h3>
                    <p className="text-sm text-muted-foreground">AI-powered suggestions to help you grow</p>
                </div>
                <Button onClick={() => generateRecommendations()} disabled={loading} size="sm" variant="outline">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <ScrollArea className="flex-1">
                {matches.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Button onClick={() => generateRecommendations()} disabled={loading}>
                            Generate Recommendations
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                        {matches.map((rec, idx) => (
                            <div
                                key={idx}
                                className="border rounded-xl p-5 space-y-3 bg-card hover:shadow-md transition-all hover:scale-[1.01]"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 text-primary">
                                        {getCategoryIcon(rec.category)}
                                        <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                                            {rec.category}
                                        </Badge>
                                    </div>
                                    <Badge variant={getPriorityColor(rec.priority)}>
                                        {rec.priority} Priority
                                    </Badge>
                                </div>

                                <div>
                                    <h4 className="font-bold text-lg mb-1">{rec.title}</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );

    return (
        <ExpandableWidget
            title="Recommendations"
            icon={<Lightbulb className="w-5 h-5 text-yellow-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
            onExpandChange={onExpand}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
