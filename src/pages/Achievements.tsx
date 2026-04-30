import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAchievements, createAchievement, verifyAchievement } from '@/lib/supabase/achievements';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Medal, Plus, CheckCircle, Shield } from 'lucide-react';
import type { Achievement } from '@/integrations/supabase/types';

interface Achievement {
    id: number;
    title: string;
    description: string;
    date_earned: string;
    verified: boolean;
    verified_by?: number;
    verifier_name?: string;
    certificate_url?: string;
}

interface StudentStats {
    points: number;
    level: string;
    achievements_count: number;
}

const Achievements = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [list, setList] = useState<Achievement[]>([]);
    const [stats, setStats] = useState<StudentStats>({ points: 0, level: 'Basic', achievements_count: 0 });
    const [loading, setLoading] = useState(true);

    // Form State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', date_earned: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            if (!user) return;
            const [achievementsData, { data: levelData }] = await Promise.all([
                getAchievements(user.id),
                supabase.from('student_levels').select('*').eq('user_id', user.id).single()
            ]);

            setList(achievementsData as any[]);
            setStats({
                points: levelData?.points || 0,
                level: levelData?.level?.toString() || '1',
                achievements_count: achievementsData.length
            });
        } catch (error) {
            console.error('Fetch data error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);
        try {
            await createAchievement({
                user_id: user.id,
                title: formData.title,
                description: formData.description,
                date_earned: formData.date_earned
            });
            toast({ title: "Achievement Added", description: "Pending verification." });
            setIsAddOpen(false);
            setFormData({ title: '', description: '', date_earned: '' });
            fetchData();
        } catch (error) {
            toast({ title: "Error", description: "Failed to add achievement", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerify = async (id: string) => {
        if (user?.role !== 'teacher' && user?.role !== 'admin') return;
        try {
            await verifyAchievement(id);
            toast({ title: "Verified", description: "Achievement verified successfully" });
            fetchData();
        } catch (error) {
            toast({ title: "Error", description: "Failed to verify", variant: "destructive" });
        }
    };

    // Level Logic
    const getLevelColor = (level: string) => {
        if (level === 'Gold') return 'text-yellow-500';
        if (level === 'Silver') return 'text-gray-400';
        if (level === 'Bronze') return 'text-amber-700';
        return 'text-slate-600';
    };

    const nextLevel = stats.level === 'Basic' ? 200 : stats.level === 'Bronze' ? 500 : stats.level === 'Silver' ? 1000 : 2000;
    const progressPercent = Math.min(100, (stats.points / nextLevel) * 100);

    return (
        <div className="container mx-auto py-8">
            {/* Hero / Stats */}
            <div className="bg-card border rounded-xl p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-full bg-secondary/10 ${getLevelColor(stats.level)}`}>
                        <Trophy className="h-12 w-12" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">My Achievements</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xl font-bold ${getLevelColor(stats.level)}`}>{stats.level} Level</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-lg font-medium">{stats.points} Points</span>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-1/3 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Progress to next level</span>
                        <span>{stats.points} / {nextLevel} XP</span>
                    </div>
                    <Progress value={progressPercent} className="h-3" />
                </div>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Badges Case</h2>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Claim Achievement
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Claim Achievement</DialogTitle></DialogHeader>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Science Fair Winner"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={formData.date_earned}
                                    onChange={e => setFormData({ ...formData, date_earned: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Tell us more..."
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Claim'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {list.map(item => (
                    <Card key={item.id} className={`relative overflow-hidden transition-all hover:shadow-md ${item.verified ? 'border-primary/20 bg-primary/5' : ''}`}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className={`p-2 rounded-lg ${item.verified ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                    {item.verified ? <Medal className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
                                </div>
                                {item.verified ? (
                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">Verified</Badge>
                                ) : (
                                    <Badge variant="secondary">Pending</Badge>
                                )}
                            </div>
                            <CardTitle className="mt-4">{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                            <div className="text-xs text-muted-foreground">
                                Earned: {new Date(item.date_earned).toLocaleDateString()}
                            </div>
                            {item.verified && item.verifier_name && (
                                <div className="mt-2 text-xs text-green-700 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> Verified by {item.verifier_name}
                                </div>
                            )}

                            {/* Teacher Action */}
                            {(user?.role === 'teacher' || user?.role === 'admin') && !item.verified && (
                                <Button size="sm" variant="outline" className="w-full mt-4 border-green-600 text-green-600 hover:bg-green-50" onClick={() => handleVerify(item.id)}>
                                    Verify Claim (+50 XP)
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default Achievements;
