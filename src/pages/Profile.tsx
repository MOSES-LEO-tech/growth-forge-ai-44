import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile, linkParent } from '@/lib/supabase/profile';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, User as UserIcon, BookOpen, Link as LinkIcon, Settings } from 'lucide-react';
import type { Profile as ProfileType } from '@/integrations/supabase/types';

interface ProfileData {
    id: number;
    full_name: string;
    email: string;
    role: string;
    school_name?: string;
    avatar_url?: string;
    bio?: string;
    grade?: string;
    date_of_birth?: string;
    phone?: string;
    address?: string;
    portfolio_visibility?: string;
    subjects?: string[];
    intended_course?: string;
    gpa?: string;
    location?: string;
    graduation_year?: number;
}

const Profile = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<any | null>(null);

    // Form states
    const [bio, setBio] = useState('');
    const [grade, setGrade] = useState('');
    const [location, setLocation] = useState('');
    const [parentEmail, setParentEmail] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            if (!user) return;
            const data = await getProfile(user.id);
            setData(data);

            // Initialize form
            setBio(data.bio || '');
            setGrade(data.grade_level || '');
            setLocation(data.bio || ''); // Just a placeholder if location is not in schema
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            toast({
                title: "Error",
                description: "Failed to load profile data",
                variant: "destructive"
            });
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
                grade_level: grade,
            });
            toast({
                title: "Success",
                description: "Profile updated successfully"
            });
            fetchProfile(); // Refresh data
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update profile",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleLinkParent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        try {
            await linkParent(user.id, parentEmail);
            toast({
                title: "Success",
                description: "Link created with parent"
            });
            setParentEmail('');
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
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Sidebar / Header Card */}
                <Card className="w-full md:w-1/3">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={data.avatar_url} />
                                <AvatarFallback className="text-2xl">{data.full_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                        <CardTitle>{data.full_name}</CardTitle>
                        <CardDescription className="capitalize">{data.role}</CardDescription>
                        {data.school_name && (
                            <Badge variant="outline" className="mt-2 mx-auto w-fit">
                                {data.school_name}
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <UserIcon className="h-4 w-4" />
                            <span>{data.email}</span>
                        </div>
                        {data.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Location:</span> {data.location}
                            </div>
                        )}
                        {data.grade && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Grade:</span> {data.grade}
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
                                        <>
                                            <div>
                                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4" /> Academic Focus
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-sm text-muted-foreground">Intended Course</span>
                                                        <p>{data.intended_course || "Not set"}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm text-muted-foreground">GPA</span>
                                                        <p>{data.gpa || "N/A"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
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
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="phone">Phone</Label>
                                                <Input
                                                    id="phone"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="+123..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="location">Location</Label>
                                                <Input
                                                    id="location"
                                                    value={location}
                                                    onChange={(e) => setLocation(e.target.value)}
                                                    placeholder="City, Country"
                                                />
                                            </div>
                                        </div>

                                        {data.role === 'student' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="grade">Grade/Year</Label>
                                                    <Input
                                                        id="grade"
                                                        value={grade}
                                                        onChange={(e) => setGrade(e.target.value)}
                                                        placeholder="e.g. 10th Grade"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="course">Intended Course</Label>
                                                    <Input
                                                        id="course"
                                                        value={intendedCourse}
                                                        onChange={(e) => setIntendedCourse(e.target.value)}
                                                        placeholder="e.g. Computer Science"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="address">Address</Label>
                                            <Input
                                                id="address"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                placeholder="Full address"
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
                                    <form onSubmit={handleLinkParent} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="parentEmail">Parent's Email</Label>
                                            <Input
                                                id="parentEmail"
                                                type="email"
                                                value={parentEmail}
                                                onChange={(e) => setParentEmail(e.target.value)}
                                                placeholder="parent@example.com"
                                                required
                                            />
                                        </div>
                                        <Button type="submit" disabled={saving}>
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
    );
};

export default Profile;
