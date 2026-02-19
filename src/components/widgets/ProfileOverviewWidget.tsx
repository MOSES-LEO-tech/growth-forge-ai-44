import { useState } from "react";
import { profile as profileApi, projects, achievements, type Profile } from "@/services/api";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { User, Mail, Edit3, Loader2, BookOpen, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ProfileOverviewWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
    profile: Profile;
}

export function ProfileOverviewWidget({ className, defaultExpanded, profile }: ProfileOverviewWidgetProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ projects: 0, achievements: 0 });
    const [editForm, setEditForm] = useState({
        full_name: profile.full_name || '',
        bio: '',
        interests: ''
    });

    const fetchStats = async () => {
        try {
            const [projectsRes, achievementsRes] = await Promise.all([
                projects.getAll({}),
                achievements.getAll({})
            ]);
            setStats({
                projects: (projectsRes.data as unknown as any[])?.length || 0,
                achievements: (achievementsRes.data as unknown as any[])?.length || 0
            });
        } catch (error) {
            console.error("Failed to fetch profile stats:", error);
        }
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            await profileApi.updateMe({
                full_name: editForm.full_name,
                bio: editForm.bio,
                interests: editForm.interests.split(',').map(i => i.trim()).filter(Boolean)
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-4">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xl font-bold">
                    {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{profile.full_name || 'Student'}</h3>
                    <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-blue-500/10 rounded-lg p-2">
                    <BookOpen className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                    <span className="text-lg font-bold">{stats.projects}</span>
                    <p className="text-xs text-muted-foreground">Projects</p>
                </div>
                <div className="bg-amber-500/10 rounded-lg p-2">
                    <Award className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                    <span className="text-lg font-bold">{stats.achievements}</span>
                    <p className="text-xs text-muted-foreground">Achievements</p>
                </div>
            </div>
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col h-full gap-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-3xl font-bold">
                    {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{profile.full_name || 'Not set'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{profile.email}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                        <p className="text-2xl font-bold">{stats.projects}</p>
                        <p className="text-xs text-muted-foreground">Projects</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <Award className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                        <p className="text-2xl font-bold">{stats.achievements}</p>
                        <p className="text-xs text-muted-foreground">Achievements</p>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Profile
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>
                            Update your personal information and preferences.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                value={editForm.full_name}
                                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="bio">Bio</Label>
                            <Textarea
                                id="bio"
                                placeholder="Tell us about yourself..."
                                value={editForm.bio}
                                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="interests">Interests (comma separated)</Label>
                            <Input
                                id="interests"
                                placeholder="coding, music, sports..."
                                value={editForm.interests}
                                onChange={(e) => setEditForm({ ...editForm, interests: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveProfile} disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );

    return (
        <ExpandableWidget
            title="Profile Overview"
            icon={<User className="w-5 h-5 text-primary" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
