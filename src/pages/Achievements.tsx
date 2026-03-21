import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAchievements, createAchievement } from '@/lib/supabase/achievements';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trophy, Plus, CheckCircle } from 'lucide-react';
import type { Achievement } from '@/types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const Achievements = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [list, setList] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', date_earned: '', category: 'academic' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { fetchData(); }, [user]);

    const fetchData = async () => {
        try {
            if (!user) return;
            const data = await getAchievements(user.id);
            setList(data);
        } catch (error) {
            console.error('Fetch error:', error);
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
                category: formData.category,
                date_earned: formData.date_earned,
            });
            toast({ title: 'Achievement added!' });
            setIsAddOpen(false);
            setFormData({ title: '', description: '', date_earned: '', category: 'academic' });
            fetchData();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">My Achievements</h1>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="w-4 h-4 mr-2" /> Add Achievement</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add Achievement</DialogTitle></DialogHeader>
                            <form onSubmit={handleAdd} className="space-y-4">
                                <div><Label>Title</Label><Input value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} required /></div>
                                <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} /></div>
                                <div><Label>Date Earned</Label><Input type="date" value={formData.date_earned} onChange={e => setFormData(f => ({ ...f, date_earned: e.target.value }))} required /></div>
                                <DialogFooter><Button type="submit" disabled={submitting}>{submitting ? 'Adding...' : 'Add'}</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading...</div>
                ) : list.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No achievements yet. Add your first one!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {list.map(a => (
                            <Card key={a.id}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-amber-500" />
                                        {a.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-2">{a.description}</p>
                                    <div className="flex gap-2">
                                        <Badge variant="outline">{a.category}</Badge>
                                        {a.verified && <Badge className="bg-emerald-500/10 text-emerald-700"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">{new Date(a.date_earned).toLocaleDateString()}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default Achievements;
