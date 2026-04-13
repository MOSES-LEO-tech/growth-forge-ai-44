import { useState, useEffect } from "react";
import { getProfile, updateProfile } from "@/lib/supabase/profile";
import { getProjects } from "@/lib/supabase/projects";
import { getAchievements } from "@/lib/supabase/achievements";
import type { Profile } from "@/integrations/supabase/types";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { User, Mail, Edit3, Loader2, BookOpen, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileOverviewWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
    profile: Profile;
}

export function ProfileOverviewWidget({ className, defaultExpanded, profile }: ProfileOverviewWidgetProps) {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ projects: 0, achievements: 0 });
    const [editForm, setEditForm] = useState({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        interests: Array.isArray(profile.interests)
            ? profile.interests.join(', ')
            : ''
    });

    // Fetch full profile to pre-populate bio & interests (not always in the auth token payload)
    useEffect(() => {
        getProfile(profile.id).then((data) => {
            setEditForm(f => ({
                ...f,
                bio: f.bio || data?.bio || '',
                interests: f.interests || (
                    Array.isArray(data?.interests)
                        ? data.interests.join(', ')
                        : ''
                ),
            }));
        }).catch(() => { /* silently ignore */ });
    }, [profile.id]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [projectsData, achievementsData] = await Promise.all([
                    getProjects(profile.id),
                    getAchievements(profile.id)
                ]);
                setStats({
                    projects: projectsData?.length || 0,
                    achievements: achievementsData?.length || 0
                });
            } catch (error) {
                console.error("Failed to fetch profile stats:", error);
            }
        };
        fetchStats();
    }, [profile.id]);

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            await updateProfile(profile.id, {
                full_name: editForm.full_name,
                bio: editForm.bio,
                interests: editForm.interests.split(',').map(i => i.trim()).filter(Boolean)
            });
            setIsEditing(false);
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error("Failed to update profile:", error);
            toast.error("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    // Collapsed view - shown in the card
    const collapsedContent = (
        <div className="flex flex-col h-full gap-4">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{profile.full_name || 'Student'}</h3>
                    <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
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

    // Expanded view - shown in the dialog
    const expandedContent = (
        <div className="flex flex-col h-full gap-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                    {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{profile.full_name || 'Not set'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{user?.email}</span>
                    </div>
                    {profile.school_name && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">🏫 {profile.school_name}</span>
                        </div>
                    )}
                    {editForm.bio && (
                        <p className="text-sm text-muted-foreground mt-1 italic">{editForm.bio}</p>
                    )}
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

            <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
            </Button>
        </div>
    );

    return (
        <>
            <ExpandableWidget
                title="Profile Overview"
                icon={<User className="w-5 h-5 text-primary" />}
                className={className}
                defaultExpanded={defaultExpanded}
                expandedContent={expandedContent}
            >
                {collapsedContent}
            </ExpandableWidget>

            {/* Edit Profile Dialog - rendered outside ExpandableWidget to prevent blink */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
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
        </>
    );
}
