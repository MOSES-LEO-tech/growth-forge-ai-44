import { useState } from "react";
import { scholarship } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, GraduationCap, ExternalLink } from "lucide-react";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScholarshipMatch {
    id: string;
    title: string;
    description: string;
    amount: number;
    deadline: string;
    organization: string;
    application_url: string;
    match_score: 'high' | 'medium' | 'low';
    match_reason: string;
    requirements: string[];
}

interface ScholarshipsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

export function ScholarshipsWidget({ className, defaultExpanded }: ScholarshipsWidgetProps) {
    const [matches, setMatches] = useState<ScholarshipMatch[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const findMatches = async (showToast = true) => {
        setLoading(true);
        try {
            const response = await scholarship.match();
            const data = response.data;
            setMatches(data.matches);
            if (showToast) {
                toast({
                    title: "Scholarships matched",
                    description: `Found ${data.matches.length} matching scholarships for you!`,
                });
            }
        } catch (error) {
            console.error('Error matching scholarships:', error);
            if (showToast) {
                toast({
                    title: "Error",
                    description: "Failed to find scholarship matches. Please try again.",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const getMatchColor = (score: string) => {
        switch (score) {
            case 'high': return 'default';
            case 'medium': return 'secondary';
            case 'low': return 'outline';
            default: return 'outline';
        }
    };

    // Auto-load matches if not loaded
    const onExpand = (expanded: boolean) => {
        if (expanded && matches.length === 0 && !loading) {
            findMatches(false);
        }
    }

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-4">
            <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
                <GraduationCap className="w-8 h-8 text-primary mb-2 opacity-80" />
                <p className="text-sm font-medium">Find funding for your future</p>
                <p className="text-xs text-muted-foreground mt-1">
                    {matches.length > 0 ? `${matches.length} matches found` : "Check for matches based on your profile"}
                </p>
            </div>
            <Button size="sm" variant="outline" className="w-full mt-auto" onClick={(e) => { e.stopPropagation(); findMatches(); }}>
                {loading ? "Searching..." : "Find Matches"}
            </Button>
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col h-full gap-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Matched Scholarships</h3>
                <Button onClick={() => findMatches()} disabled={loading} size="sm">
                    {loading ? "Refreshing..." : "Refresh Matches"}
                </Button>
            </div>

            <ScrollArea className="flex-1">
                {matches.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p className="mb-4">No matches found yet.</p>
                        <Button onClick={() => findMatches()} disabled={loading}>
                            Find Matches
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 pb-6">
                        {matches.map((scholarship) => (
                            <div key={scholarship.id} className="border rounded-lg p-5 space-y-3 bg-card hover:shadow-md transition-shadow">
                                <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-lg">{scholarship.title}</h4>
                                            <Badge variant={getMatchColor(scholarship.match_score)} className="ml-2">
                                                {scholarship.match_score} match
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground font-medium">{scholarship.organization}</p>
                                    </div>
                                    {scholarship.amount && (
                                        <Badge variant="outline" className="text-lg px-3 py-1 bg-green-50 text-green-700 border-green-200">
                                            ${scholarship.amount.toLocaleString()}
                                        </Badge>
                                    )}
                                </div>

                                <p className="text-sm text-muted-foreground">{scholarship.description}</p>

                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>Due: {new Date(scholarship.deadline).toLocaleDateString()}</span>
                                    </div>
                                    {scholarship.requirements && (
                                        <div className="flex gap-2">
                                            {scholarship.requirements.map((req, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs h-5">
                                                    {req}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-muted/50 p-3 rounded-md text-sm">
                                    <span className="font-semibold text-primary block mb-1">Why it matches:</span>
                                    {scholarship.match_reason}
                                </div>

                                {scholarship.application_url && (
                                    <div className="pt-2">
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => window.open(scholarship.application_url, '_blank')}
                                        >
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Apply Now
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );

    return (
        <ExpandableWidget
            title="Scholarships"
            icon={<GraduationCap className="w-5 h-5 text-indigo-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
            onExpandChange={onExpand}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
