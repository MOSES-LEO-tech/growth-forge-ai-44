import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile, uploadAvatar, linkParent } from '@/lib/supabase/profile';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, User as UserIcon, BookOpen, Link as LinkIcon, Settings, Camera, AlertTriangle } from 'lucide-react';
import type { Profile as ProfileType } from '@/integrations/supabase/types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Profile = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [data, setData] = useState<ProfileType | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [bio, setBio] = useState('');
    const [grade, setGrade] = useState('');
    const [parentEmail, setParentEmail] = useState('');
    const [parentEmailTouched, setParentEmailTouched] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            if (!user) return;
            setLoadError(null);
            const data = await getProfile(user.id);
            setData(data);
            setBio(data.bio || '');
            setGrade(data.grade_level || '');
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            setLoadError('We could not load your profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        try {
            await updateProfile(user.id, {
                bio,
                grade_level: grade || null,
            });
            toast({ title: "Success", description: "Profile updated successfully" });
            fetchProfile();
        } catch (error) {
            toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !user) return;

        if (!file.type.startsWith('image/')) {
            toast({ title: "Error", description: "Please choose an image file (JPG, PNG, or WebP)", variant: "destructive" });
            return;
        }

        setAvatarUploading(true);
        try {
            await uploadAvatar(user.id, file);
            toast({ title: "Success", description: "Profile picture updated" });
            fetchProfile();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to upload avatar";
            toast({ title: "Error", description: message, variant: "destructive" });
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleLinkParent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!EMAIL_PATTERN.test(parentEmail)) {
            setParentEmailTouched(true);
            return;
        }
        setSaving(true);
        try {
            await linkParent(user.id, parentEmail);
            toast({ title: "Success", description: "Link created with parent" });
            setParentEmail('');
            setParentEmailTouched(false);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to link parent. Check email and try again.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]" aria-label="Loading profile">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    if (loadError || !data) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 pt-24 pb-8">
                    <Breadcrumb to="/dashboard" label="Back to Dashboard" />
                    <Card className="mx-auto mt-8 max-w-md">
                        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                            <AlertTriangle className="h-10 w-10 text-amber-500" />
                            <p className="font-medium">{loadError || "Profile unavailable"}</p>
                            <Button variant="outline" onClick={() => { setLoading(true); fetchProfile(); }}>
                                Try Again
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const parentEmailValid = EMAIL_PATTERN.test(parentEmail);
    const showParentError = parentEmailTouched && !parentEmailValid;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 pt-24 pb-8">
                <Breadcrumb to="/dashboard" label="Back to Dashboard" />

                <div className="flex flex-col md:flex-row gap-8 items-start mt-6">
                    {/* Sidebar / Header Card */}
                    <Card className="w-full md:w-1/3">
                        <CardHeader className="text-center">
                            <div className="relative mx-auto mb-4 w-fit">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={data.avatar_url || undefined} alt={data.full_name || "Profile"} />
                                    <AvatarFallback className="text-2xl">{data.full_name?.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border shadow-sm"
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={avatarUploading}
                                    aria-label="Change profile picture"
                                >
                                    {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                </Button>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={handleAvatarUpload}
                                />
                            </div>
                            <CardTitle>{data.full_name || "Unnamed student"}</CardTitle>
                            <CardDescription className="capitalize">{data.role || 'student'}</CardDescription>
                            {data.school_id && (
                                <Badge variant="outline" className="mt-2 mx-auto w-fit">
                                    School enrolled
                                </Badge>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <UserIcon className="h-4 w-4 shrink-0" />
                                <span className="truncate">{data.email}</span>
                            </div>
                            {data.grade_level && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="font-semibold">Grade:</span> {data.grade_level}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Main Content Tabs */}
                    <div className="w-full md:w-2/3">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="settings">Settings</TabsTrigger>
                                {data.role === 'student' && <TabsTrigger value="linking">Linking</TabsTrigger>}
                            </TabsList>

                            {/* Overview Tab */}
                            <TabsContent value="overview">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>About Me</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <h3 className="font-semibold mb-2">Bio</h3>
                                            <p className="text-muted-foreground">
                                                {data.bio || "No bio added yet."}
                                            </p>
                                        </div>

                                        {data.role === 'student' && (
                                            <div>
                                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4" /> Academic Focus
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-sm text-muted-foreground">GPA</span>
                                                        <p>{data.gpa != null ? data.gpa : "N/A"}</p>
                                                    </div>
                                                    {data.subjects && data.subjects.length > 0 && (
                                                        <div>
                                                            <span className="text-sm text-muted-foreground">Subjects</span>
                                                            <p className="text-sm">{data.subjects.join(', ')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Settings Tab */}
                            <TabsContent value="settings">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Edit Profile</CardTitle>
                                        <CardDescription>Update your personal information</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleUpdate} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="bio">Bio</Label>
                                                <Textarea
                                                    id="bio"
                                                    value={bio}
                                                    onChange={(e) => setBio(e.target.value)}
                                                    placeholder="Tell us about yourself..."
                                                    rows={4}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="grade">Grade/Year</Label>
                                                <Input
                                                    id="grade"
                                                    value={grade}
                                                    onChange={(e) => setGrade(e.target.value)}
                                                    placeholder="e.g. 10th Grade"
                                                />
                                            </div>

                                            <Button type="submit" disabled={saving}>
                                                {saving ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Settings className="mr-2 h-4 w-4" /> Save Changes
                                                    </>
                                                )}
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Linking Tab */}
                            <TabsContent value="linking">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Parent Linking</CardTitle>
                                        <CardDescription>Connect your account with a parent</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleLinkParent} noValidate className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="parentEmail">Parent's Email</Label>
                                                <Input
                                                    id="parentEmail"
                                                    type="email"
                                                    value={parentEmail}
                                                    onChange={(e) => setParentEmail(e.target.value)}
                                                    onBlur={() => setParentEmailTouched(true)}
                                                    placeholder="parent@example.com"
                                                    aria-invalid={showParentError || undefined}
                                                    aria-describedby={showParentError ? "parent-email-error" : undefined}
                                                />
                                                {showParentError && (
                                                    <p id="parent-email-error" className="text-sm text-destructive">
                                                        Please enter a valid email address.
                                                    </p>
                                                )}
                                            </div>
                                            <Button type="submit" disabled={saving || !parentEmail}>
                                                {saving ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                                                    </>
                                                ) : (
                                                    <>
                                                        <LinkIcon className="mr-2 h-4 w-4" /> Send Link Request
                                                    </>
                                                )}
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
