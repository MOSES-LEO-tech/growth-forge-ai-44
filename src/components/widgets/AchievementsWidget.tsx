import { useState, useEffect, useCallback } from "react";
import { getAchievements, createAchievement, deleteAchievement } from "@/lib/supabase/achievements";
import { supabase } from "@/integrations/supabase/client";
import type { Achievement } from "@/types";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Award, Search, Plus, Trash2, CheckCircle, Clock, Loader2, Upload } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

interface AchievementsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
    userId?: string;
}

type AchievementWithCategory = Achievement & { category?: string };

const CATEGORIES = ["academic", "sports", "leadership", "arts", "technology", "community"];

export function AchievementsWidget({ className, defaultExpanded, userId }: AchievementsWidgetProps) {
    const [achievements, setAchievements] = useState<AchievementWithCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    // Add achievement form state
    const [addOpen, setAddOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "academic",
        date_earned: new Date().toISOString().split("T")[0],
        certificate_file: null as File | null,
    });

    const fetchAchievements = useCallback(async () => {
        try {
            if (!userId) return;
            setLoading(true);
            setError(null);
            const list = await getAchievements(userId);
            setAchievements(list);
        } catch (err: any) {
            console.error("Failed to fetch achievements:", err);
            setError("Failed to load achievements");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { fetchAchievements(); }, [fetchAchievements]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) {
            toast({ title: "Title required", variant: "destructive" });
            return;
        }
        if (!userId) return;
        setSubmitting(true);
        try {
            let certificateUrl: string | undefined;

            // Optional: upload certificate file first
            if (form.certificate_file) {
                setUploadProgress(0);
                const fileExt = form.certificate_file.name.split('.').pop();
                const fileName = `${userId}/${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('project-media') // Reusing project-media bucket for certificates
                    .upload(filePath, form.certificate_file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('project-media')
                    .getPublicUrl(filePath);
                
                certificateUrl = publicUrl;
            }

            await createAchievement({
                user_id: userId,
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                category: form.category,
                date_earned: form.date_earned,
            });

            toast({ title: "Achievement added!", description: "Submitted for teacher verification." });
            setAddOpen(false);
            setForm({ title: "", description: "", category: "academic", date_earned: new Date().toISOString().split("T")[0], certificate_file: null });
            fetchAchievements();
        } catch (err: any) {
            toast({ title: "Failed to add achievement", description: err.message || "Please try again.", variant: "destructive" });
        } finally {
            setSubmitting(false);
            setUploadProgress(0);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this achievement?")) return;
        try {
            await deleteAchievement(id);
            setAchievements(prev => prev.filter(a => a.id !== id));
            toast({ title: "Achievement deleted" });
        } catch {
            toast({ title: "Failed to delete", variant: "destructive" });
        }
    };

    const filtered = achievements.filter(a => {
        const matchSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.description ?? "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchCat = categoryFilter === "all" || (a.category ?? "") === categoryFilter;
        return matchSearch && matchCat;
    });

    const verified = achievements.filter(a => a.verified).length;

    // ── Collapsed ─────────────────────────────────────────────────────────────
    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-4">
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center text-sm text-destructive">{error}</div>
            ) : achievements.length > 0 ? (
                <>
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-amber-500/10 rounded-lg p-3">
                            <Award className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                            <span className="text-2xl font-bold">{achievements.length}</span>
                            <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                        <div className="bg-emerald-500/10 rounded-lg p-3">
                            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                            <span className="text-2xl font-bold">{verified}</span>
                            <p className="text-xs text-muted-foreground">Verified</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {achievements.slice(0, 2).map(a => (
                            <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center flex-shrink-0">
                                    <Award className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{a.title}</div>
                                    <div className="text-xs text-muted-foreground">{a.category ?? "—"}</div>
                                </div>
                                {a.verified
                                    ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    : <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                }
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <Award className="w-12 h-12 opacity-20 mb-2" />
                    <p className="text-sm">No achievements yet</p>
                </div>
            )}
        </div>
    );

    // ── Expanded ──────────────────────────────────────────────────────────────
    const ExpandedContent = () => (
        <div className="flex flex-col h-full gap-6">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search achievements..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button onClick={() => setAddOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Achievement
                </Button>
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                ) : error ? (
                    <div className="text-center py-12 text-destructive">
                        {error}
                        <button onClick={fetchAchievements} className="block mt-2 mx-auto text-sm text-primary underline">Retry</button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No achievements found.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                        {filtered.map(achievement => (
                            <div key={achievement.id} className="flex flex-col gap-2 p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <Award className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold leading-tight">{achievement.title}</h4>
                                            {achievement.category && (
                                                <Badge variant="outline" className="text-[10px] mt-0.5 capitalize">{achievement.category}</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {achievement.verified
                                            ? <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>
                                            : <Badge variant="secondary" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
                                        }
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(achievement.id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                                {achievement.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{achievement.description}</p>}
                                {achievement.media_id && (
                                    <span className="text-xs text-primary">Has media</span>
                                )}
                                <div className="mt-auto pt-2 border-t text-xs text-muted-foreground">
                                    {achievement.date_earned ? new Date(achievement.date_earned).toLocaleDateString() : ""}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Add Achievement Dialog */}
            <Dialog open={addOpen} onOpenChange={o => { setAddOpen(o); }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader><DialogTitle>Add Achievement</DialogTitle></DialogHeader>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="ach-title">Title *</Label>
                            <Input id="ach-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Regional Science Fair Winner" required />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="ach-desc">Description</Label>
                            <Textarea id="ach-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Tell us more about this achievement..." rows={3} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Category</Label>
                                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="ach-date">Date Earned</Label>
                                <Input id="ach-date" type="date" value={form.date_earned} onChange={e => setForm(f => ({ ...f, date_earned: e.target.value }))} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="ach-cert">Certificate (optional)</Label>
                            <div className="flex items-center gap-2">
                                <Input id="ach-cert" type="file" accept="image/*,.pdf" className="flex-1" onChange={e => setForm(f => ({ ...f, certificate_file: e.target.files?.[0] || null }))} />
                                {uploadProgress > 0 && uploadProgress < 100 && <span className="text-xs text-muted-foreground">{uploadProgress}%</span>}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 inline mr-1" />Your achievement will be pending until a teacher verifies it.
                        </p>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : <><Upload className="w-4 h-4 mr-2" />Submit</>}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
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
