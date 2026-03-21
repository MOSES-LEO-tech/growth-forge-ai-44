import { useState, useEffect } from "react";
import { getPendingAchievements, verifyAchievement } from "@/lib/supabase/achievements";
import { getPendingProjects, verifyProject } from "@/lib/supabase/projects";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Check, X, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PendingApprovalsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

export function PendingApprovalsWidget({ className, defaultExpanded }: PendingApprovalsWidgetProps) {
    const { toast } = useToast();
    const [pendingAchievements, setPendingAchievements] = useState<any[]>([]);
    const [pendingProjects, setPendingProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifyId, setVerifyId] = useState<string | null>(null);
    const [verifyType, setVerifyType] = useState<'achievement' | 'project' | null>(null);

    const fetchPendingData = async () => {
        setLoading(true);
        try {
            const [achievements, projects] = await Promise.all([
                getPendingAchievements(),
                getPendingProjects()
            ]);
            setPendingAchievements(achievements);
            setPendingProjects(projects);
        } catch (error) {
            console.error("Failed to fetch pending data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingData();
    }, []);

    const handleVerify = async () => {
        if (!verifyId || !verifyType) return;

        try {
            if (verifyType === 'achievement') {
                await verifyAchievement(verifyId);
            } else {
                await verifyProject(verifyId);
            }
            toast({ title: "Verified", description: "Item verified successfully" });
            fetchPendingData();
            setVerifyId(null);
            setVerifyType(null);
        } catch (error) {
            toast({ title: "Error", description: "Failed to verify item", variant: "destructive" });
        }
    };

    const confirmVerify = (id: string, type: 'achievement' | 'project') => {
        setVerifyId(id);
        setVerifyType(type);
    };

    const totalPending = pendingAchievements.length + pendingProjects.length;

    const CollapsedContent = () => (
        <div className="flex flex-col h-full items-center justify-center text-center gap-4">
            <div className="relative">
                <CheckCircle className={`w-12 h-12 ${totalPending > 0 ? 'text-amber-500' : 'text-green-500'} opacity-80`} />
                {totalPending > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full min-w-[20px] justify-center">
                        {totalPending}
                    </Badge>
                )}
            </div>
            <div>
                <p className="text-2xl font-bold">{totalPending}</p>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
            </div>
            {totalPending > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    Action Required
                </p>
            )}
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col h-full gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Verification Queue</h3>
                    <p className="text-sm text-muted-foreground">Review and approve student submissions</p>
                </div>
                <Button size="sm" variant="outline" onClick={fetchPendingData} disabled={loading}>
                    Referesh
                </Button>
            </div>

            <Tabs defaultValue="achievements" className="flex-1 flex flex-col">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
                    <TabsTrigger value="achievements">
                        Achievements
                        {pendingAchievements.length > 0 && <Badge variant="secondary" className="ml-2 text-xs">{pendingAchievements.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="projects">
                        Projects
                        {pendingProjects.length > 0 && <Badge variant="secondary" className="ml-2 text-xs">{pendingProjects.length}</Badge>}
                    </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 h-full pr-4">
                    <TabsContent value="achievements" className="mt-0 space-y-4">
                        {loading ? <div className="text-center py-8">Loading...</div> : pendingAchievements.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>All caught up! No pending achievements.</p>
                            </div>
                        ) : (
                            pendingAchievements.map(item => (
                                <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border rounded-xl bg-card hover:shadow-sm transition-shadow">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold">{item.title}</h4>
                                            <Badge variant="outline" className="bg-primary/5">{item.student_name || "Unknown Student"}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span>Earned: {new Date(item.date_earned).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <Button size="sm" className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700" onClick={() => confirmVerify(item.id, 'achievement')}>
                                            <Check className="w-4 h-4 mr-2" /> Verify
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="projects" className="mt-0 space-y-4">
                        {loading ? <div className="text-center py-8">Loading...</div> : pendingProjects.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>All caught up! No pending projects.</p>
                            </div>
                        ) : (
                            pendingProjects.map(item => (
                                <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border rounded-xl bg-card hover:shadow-sm transition-shadow">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold">{item.title}</h4>
                                            <Badge variant="outline" className="bg-primary/5">{item.student_name || "Unknown Student"}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                                        {item.thumbnail_url && (
                                            <img src={item.thumbnail_url} alt="Project Thumbnail" className="w-20 h-12 object-cover rounded mb-2 border" />
                                        )}
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <Button size="sm" variant="outline" className="flex-1 sm:flex-initial" onClick={() => window.open(`/dashboard?widget=projects&id=${item.id}`, '_blank')}>
                                            <ExternalLink className="w-4 h-4 mr-2" /> View
                                        </Button>
                                        <Button size="sm" className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700" onClick={() => confirmVerify(item.id, 'project')}>
                                            <Check className="w-4 h-4 mr-2" /> Verify
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </TabsContent>
                </ScrollArea>
            </Tabs>

            <Dialog open={!!verifyId} onOpenChange={(open) => !open && setVerifyId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Verification</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to verify this {verifyType}? This action cannot be undone easily.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setVerifyId(null)}>Cancel</Button>
                        <Button onClick={handleVerify}>Confirm Verify</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );

    return (
        <ExpandableWidget
            title="Pending Approvals"
            icon={<AlertCircle className={`w-5 h-5 ${totalPending > 0 ? "text-amber-500" : "text-green-500"}`} />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
