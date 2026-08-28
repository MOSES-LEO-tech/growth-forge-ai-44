import { useState } from "react";
import { getScholarshipMatches, type ScholarshipMatch } from "@/lib/supabase/scholarshipMatching";
import { getScholarships } from "@/lib/supabase/scholarships";
import type { Scholarship } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, GraduationCap, ExternalLink, Sparkles } from "lucide-react";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScholarshipsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'context' in error) {
        const context = (error as any).context as any;
        if (context?.error) return context.error;
    }
    return error instanceof Error ? error.message : "Failed to load scholarships. Please try again.";
};

export function ScholarshipsWidget({ className, defaultExpanded }: ScholarshipsWidgetProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [matches, setMatches] = useState<ScholarshipMatch[]>([]);
    const [browseAll, setBrowseAll] = useState<Scholarship[]>([]);
    const [view, setView] = useState<'matches' | 'browse'>('matches');
    const [loading, setLoading] = useState(false);

    const getMatchColor = (score: string) => {
        switch (score) {
            case 'high': return 'default';
            case 'medium': return 'secondary';
            case 'low': return 'outline';
            default: return 'outline';
        }
    };

    const findMatches = async (showToast = true) => {
        if (!user) {
            if (showToast) {
                toast({ title: "Sign in required", description: "Sign in to find scholarship matches.", variant: "destructive" });
            }
            return;
        }
        setLoading(true);
        try {
            const { matches: result } = await getScholarshipMatches(user.id);
            setMatches(result);
            setView('matches');
            if (showToast) {
                toast({
                    title: "Matches found",
                    description: `Found ${result.length} scholarship matches for you!`,
                });
            }
        } catch (error) {
            console.error('Error fetching scholarship matches:', error);
            if (showToast) {
                toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
            }
        } finally {
            setLoading(false);
        }
    };

    const loadBrowseAll = async () => {
        if (browseAll.length > 0) return;
        setLoading(true);
        try {
            const data = await getScholarships();
            setBrowseAll(data);
        } catch (error) {
            console.error('Error fetching scholarships:', error);
            toast({ title: "Error", description: "Failed to load scholarships. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // Auto-load matches on first expand
    const onExpand = (expanded: boolean) => {
        if (expanded && matches.length === 0 && !loading) {
            findMatches(false);
        }
    };

    const renderMatchCard = (scholarship: ScholarshipMatch) => (
        <div key={scholarship.id} className="border rounded-lg p-5 space-y-3 bg-card hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-lg">{scholarship.title}</h4>
                    </div>
                    {scholarship.organization && (
                        <p className="text-xs text-muted-foreground">{scholarship.organization}</p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-2">
                    {scholarship.match_score && (
                        <Badge variant={getMatchColor(scholarship.match_score)}>
                            {scholarship.match_score} match
                        </Badge>
                    )}
                    {scholarship.amount != null && scholarship.amount > 0 && (
                        <Badge variant="outline" className="text-lg px-3 py-1 bg-green-50 text-green-700 border-green-200">
                            ${scholarship.amount.toLocaleString()}
                        </Badge>
                    )}
                </div>
            </div>

            {scholarship.match_reason && (
                <p className="text-sm text-muted-foreground">{scholarship.match_reason}</p>
            )}
            {scholarship.requirements && (
                <p className="text-sm text-muted-foreground">
                    {Array.isArray(scholarship.requirements) ? scholarship.requirements.join(', ') : scholarship.requirements}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {scholarship.deadline && (
                    <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {new Date(scholarship.deadline).toLocaleDateString()}</span>
                    </div>
                )}
                {scholarship.application_url && (
                    <a
                        href={scholarship.application_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                        Apply now <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                )}
            </div>
        </div>
    );

    const renderBrowseCard = (scholarship: Scholarship) => (
        <div key={scholarship.id} className="border rounded-lg p-5 space-y-3 bg-card hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="flex-1">
                    <h4 className="font-bold text-lg">{scholarship.title}</h4>
                </div>
                {scholarship.amount != null && scholarship.amount > 0 && (
                    <Badge variant="outline" className="text-lg px-3 py-1 bg-green-50 text-green-700 border-green-200">
                        ${scholarship.amount.toLocaleString()}
                    </Badge>
                )}
            </div>
            {scholarship.requirements && (
                <p className="text-sm text-muted-foreground">{scholarship.requirements}</p>
            )}
            {scholarship.deadline && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Due: {new Date(scholarship.deadline).toLocaleDateString()}</span>
                </div>
            )}
        </div>
    );

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-4">
            <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
                <GraduationCap className="w-8 h-8 text-primary mb-2 opacity-80" />
                <p className="text-sm font-medium">Find funding for your future</p>
                <p className="text-xs text-muted-foreground mt-1">
                    {matches.length > 0 ? `${matches.length} matches found` : "Check for AI matches based on your profile"}
                </p>
            </div>
            <Button size="sm" variant="outline" className="w-full mt-auto" onClick={(e) => { e.stopPropagation(); findMatches(); }}>
                {loading ? "Searching..." : "Find Matches"}
            </Button>
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col h-full gap-6">
            <div className="flex justify-between items-center gap-4">
                <div className="flex gap-2">
                    <Button size="sm" variant={view === 'matches' ? 'default' : 'outline'} onClick={() => setView('matches')}>
                        <Sparkles className="w-4 h-4 mr-1" />
                        AI Matches
                    </Button>
                    <Button size="sm" variant={view === 'browse' ? 'default' : 'outline'} onClick={() => { setView('browse'); loadBrowseAll(); }}>
                        Browse all
                    </Button>
                </div>
                {view === 'matches' && (
                    <Button onClick={() => findMatches()} disabled={loading} size="sm">
                        {loading ? "Refreshing..." : "Refresh Matches"}
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1">
                {view === 'matches' ? (
                    matches.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p className="mb-4">No matches found yet.</p>
                            <Button onClick={() => findMatches()} disabled={loading}>
                                {loading ? "Searching..." : "Find Matches"}
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 pb-6">
                            {matches.map(renderMatchCard)}
                        </div>
                    )
                ) : (
                    browseAll.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p className="mb-4">{loading ? "Loading scholarships..." : "No scholarships available."}</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 pb-6">
                            {browseAll.map(renderBrowseCard)}
                        </div>
                    )
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
