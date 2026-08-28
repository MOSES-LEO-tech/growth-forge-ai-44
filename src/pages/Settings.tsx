import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  Loader2,
  Lock,
  Palette,
  Save,
  School,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeProvider";
import DashboardHeader from "@/components/DashboardHeader";
import RoleOnboardingWizard from "@/components/RoleOnboardingWizard";
import { SchoolAccessWidget } from "@/components/widgets/SchoolAccessWidget";
import { SchoolSettingsWidget } from "@/components/widgets/SchoolSettingsWidget";
import { updateProfile, uploadAvatar } from "@/lib/supabase/profile";
import { COLOR_THEMES, MODE_OPTIONS } from "@/lib/theme-options";
import { EDUCATION_SYSTEMS, GRADE_OPTIONS } from "@/lib/onboarding";
import type { Profile } from "@/integrations/supabase/types";

const TIMEZONES = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Kampala",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/New_York",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
];

const NOTIFICATION_CATEGORIES = [
  { key: "announcements", label: "School announcements" },
  { key: "approvals", label: "Approvals & reviews" },
  { key: "messages", label: "Messages" },
  { key: "achievements", label: "Achievements" },
  { key: "projects", label: "Projects" },
] as const;

const listToText = (value?: string[] | null) => (Array.isArray(value) ? value.join(", ") : "");
const textToList = (value: string) => {
  const list = value.split(",").map((item) => item.trim()).filter(Boolean);
  return list.length > 0 ? list : null;
};
const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const Settings = () => {
  const { user, profile, signOut, refreshProfile, changePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme, colorTheme, setColorTheme } = useTheme();

  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    bio: "",
    avatar_url: "",
    education_system: "",
    grade_level: "",
    class_name: "",
    subjects: "",
    interests: "",
    clubs: "",
    extracurriculars: "",
    timezone: "",
    visibility: "public",
  });
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      full_name: profile.full_name || "",
      bio: profile.bio || "",
      avatar_url: profile.avatar_url || "",
      education_system: profile.education_system || "",
      grade_level: profile.grade_level || "",
      class_name: profile.class_name || "",
      subjects: listToText(profile.subjects),
      interests: listToText(profile.interests),
      clubs: listToText(profile.clubs),
      extracurriculars: listToText(profile.extracurriculars),
      timezone: profile.timezone || "",
      visibility: profile.visibility || "public",
    });
    const existing = (profile.notification_prefs || {}) as Record<string, boolean>;
    setPrefs(Object.fromEntries(NOTIFICATION_CATEGORIES.map(({ key }) => [key, existing[key] !== false])));
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const saveProfile = async () => {
    if (!user || !profile) return;
    if (!profileForm.full_name.trim()) {
      toast({ title: "Name required", description: "Add your full name before saving.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const updates: Partial<Profile> = {
        full_name: profileForm.full_name.trim(),
        bio: profileForm.bio.trim() || null,
        timezone: profileForm.timezone || null,
        visibility: profileForm.visibility,
      };
      if (profile.role === "student") {
        updates.education_system = profileForm.education_system || null;
        updates.grade_level = profileForm.grade_level || null;
        updates.class_name = profileForm.class_name || null;
        updates.subjects = textToList(profileForm.subjects);
        updates.interests = textToList(profileForm.interests);
        updates.clubs = textToList(profileForm.clubs);
        updates.extracurriculars = textToList(profileForm.extracurriculars);
      }
      if (profile.role === "teacher") {
        updates.subjects = textToList(profileForm.subjects);
      }
      await updateProfile(user.id, updates);
      toast({ title: "Profile saved" });
      await refreshProfile();
    } catch (error) {
      toast({ title: "Save failed", description: getErrorMessage(error, "Unable to save your profile."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (file: File) => {
    if (!user) return;
    setSaving(true);
    try {
      await uploadAvatar(user.id, file);
      toast({ title: "Photo updated" });
      await refreshProfile();
    } catch (error) {
      toast({ title: "Upload failed", description: getErrorMessage(error, "Unable to upload your photo."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const savePrefs = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { notification_prefs: prefs as unknown as Profile["notification_prefs"] });
      toast({ title: "Notification preferences saved" });
    } catch (error) {
      toast({ title: "Save failed", description: getErrorMessage(error, "Unable to save preferences."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async () => {
    if (passwordForm.next !== passwordForm.confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (passwordForm.next.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(passwordForm.current, passwordForm.next);
      toast({ title: "Password updated" });
      setPasswordForm({ current: "", next: "", confirm: "" });
    } catch (error) {
      toast({ title: "Password change failed", description: getErrorMessage(error, "Check your current password."), variant: "destructive" });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!profile) return null;

  const isStudent = profile.role === "student";
  const isTeacher = profile.role === "teacher";
  const isAdmin = profile.role === "admin" || profile.role === "super_admin";

  const tabs = [
    { value: "profile", label: "Profile", icon: UserIcon },
    { value: "school", label: "School", icon: School },
    { value: "notifications", label: "Notifications", icon: Bell },
    { value: "appearance", label: "Appearance", icon: Palette },
    { value: "security", label: "Security", icon: Lock },
    { value: "privacy", label: "Privacy", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader profile={profile} onSignOut={handleSignOut} onProfileUpdated={refreshProfile} />
      <main id="main-content" role="main" className="container mx-auto px-4 py-8">
        <section className="dashboard-hero flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="editorial-kicker mb-2">Settings</p>
            <h1 className="text-3xl md:text-4xl">Account settings</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Manage your profile, school, notifications, appearance, security, and privacy.
            </p>
          </div>
          <div className="flat-icon h-12 w-12 shrink-0">
            <SettingsIcon className="h-6 w-6" />
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="w-full max-w-xl flex-wrap justify-start">
            {tabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Photo</CardTitle>
                  <CardDescription>Your public avatar.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profileForm.avatar_url || undefined} alt={profileForm.full_name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {profileForm.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label className="inline-flex">
                    <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Upload photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleAvatar(file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Profile details</CardTitle>
                    <CardDescription>What others see about you.</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setShowOnboarding(true)}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Onboarding
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="settings-name">Full name</Label>
                      <Input
                        id="settings-name"
                        className="mt-1.5"
                        value={profileForm.full_name}
                        onChange={(event) => setProfileForm({ ...profileForm, full_name: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="settings-timezone">Timezone</Label>
                      <Select
                        value={profileForm.timezone}
                        onValueChange={(value) => setProfileForm({ ...profileForm, timezone: value })}
                      >
                        <SelectTrigger id="settings-timezone" className="mt-1.5">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isStudent && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <Label htmlFor="settings-education">Education system</Label>
                          <Select
                            value={profileForm.education_system}
                            onValueChange={(value) => setProfileForm({ ...profileForm, education_system: value })}
                          >
                            <SelectTrigger id="settings-education" className="mt-1.5">
                              <SelectValue placeholder="Choose one" />
                            </SelectTrigger>
                            <SelectContent>
                              {EDUCATION_SYSTEMS.map((system) => (
                                <SelectItem key={system} value={system}>
                                  {system}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="settings-grade">Grade / year</Label>
                          <Select
                            value={profileForm.grade_level}
                            onValueChange={(value) => setProfileForm({ ...profileForm, grade_level: value })}
                          >
                            <SelectTrigger id="settings-grade" className="mt-1.5">
                              <SelectValue placeholder="Choose one" />
                            </SelectTrigger>
                            <SelectContent>
                              {GRADE_OPTIONS.map((grade) => (
                                <SelectItem key={grade} value={grade}>
                                  {grade}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="settings-class">Class</Label>
                          <Input
                            id="settings-class"
                            className="mt-1.5"
                            value={profileForm.class_name}
                            onChange={(event) => setProfileForm({ ...profileForm, class_name: event.target.value })}
                            placeholder="8A"
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="settings-subjects">Subjects</Label>
                          <Input
                            id="settings-subjects"
                            className="mt-1.5"
                            value={profileForm.subjects}
                            onChange={(event) => setProfileForm({ ...profileForm, subjects: event.target.value })}
                            placeholder="Math, Science"
                          />
                        </div>
                        <div>
                          <Label htmlFor="settings-interests">Interests</Label>
                          <Input
                            id="settings-interests"
                            className="mt-1.5"
                            value={profileForm.interests}
                            onChange={(event) => setProfileForm({ ...profileForm, interests: event.target.value })}
                            placeholder="Robotics, Debate"
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="settings-clubs">Clubs</Label>
                          <Input
                            id="settings-clubs"
                            className="mt-1.5"
                            value={profileForm.clubs}
                            onChange={(event) => setProfileForm({ ...profileForm, clubs: event.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="settings-extra">Extracurriculars</Label>
                          <Input
                            id="settings-extra"
                            className="mt-1.5"
                            value={profileForm.extracurriculars}
                            onChange={(event) => setProfileForm({ ...profileForm, extracurriculars: event.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {isTeacher && (
                    <div>
                      <Label htmlFor="settings-teacher-subjects">Subjects you teach</Label>
                      <Input
                        id="settings-teacher-subjects"
                        className="mt-1.5"
                        value={profileForm.subjects}
                        onChange={(event) => setProfileForm({ ...profileForm, subjects: event.target.value })}
                        placeholder="Mathematics, Physics"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="settings-bio">Bio</Label>
                    <Textarea
                      id="settings-bio"
                      className="mt-1.5"
                      rows={3}
                      value={profileForm.bio}
                      onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })}
                      placeholder="A short introduction"
                    />
                  </div>

                  <Button onClick={() => void saveProfile()} disabled={saving}>
                    {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                    Save profile
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="school" className="mt-6">
            <div className="grid gap-4 xl:grid-cols-2">
              <SchoolAccessWidget defaultExpanded schoolId={profile.school_id} canManage={isAdmin} />
              {isAdmin && <SchoolSettingsWidget defaultExpanded schoolId={profile.school_id} />}
              {!isAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle>School</CardTitle>
                    <CardDescription>Your current school affiliation.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {profile.school_id
                        ? "You're connected to a school. Ask your school admin for help managing this connection."
                        : "You're not connected to a school yet. Use the join code above to connect."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification preferences</CardTitle>
                <CardDescription>Choose which updates appear in your notification feed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {NOTIFICATION_CATEGORIES.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">Delivered in-app via the notification bell.</p>
                    </div>
                    <Switch
                      checked={prefs[key] !== false}
                      onCheckedChange={(checked) => setPrefs({ ...prefs, [key]: checked })}
                    />
                  </div>
                ))}
                <Button onClick={() => void savePrefs()} disabled={saving}>
                  {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Save preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Theme and color preferences for this device.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="mb-3 text-sm font-medium">Mode</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {MODE_OPTIONS.map((mode) => (
                      <Button
                        key={mode.value}
                        variant={theme === mode.value ? "default" : "outline"}
                        className="justify-start gap-2"
                        onClick={() => setTheme(mode.value)}
                      >
                        <mode.icon className="h-4 w-4" />
                        {mode.name}
                        {theme === mode.value && <Check className="ml-auto h-4 w-4" />}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-sm font-medium">Color theme</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {COLOR_THEMES.map((themeOption) => (
                      <Button
                        key={themeOption.value}
                        variant={colorTheme === themeOption.value ? "default" : "outline"}
                        className="justify-start gap-2"
                        onClick={() => setColorTheme(themeOption.value)}
                      >
                        <span className="flex gap-1">
                          {themeOption.colors.map((color) => (
                            <span key={color} className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                          ))}
                        </span>
                        {themeOption.name}
                        {colorTheme === themeOption.value && <Check className="ml-auto h-4 w-4" />}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>Change password</CardTitle>
                <CardDescription>Use at least 8 characters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="settings-current">Current password</Label>
                  <Input
                    id="settings-current"
                    type="password"
                    className="mt-1.5"
                    value={passwordForm.current}
                    onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="settings-new">New password</Label>
                    <Input
                      id="settings-new"
                      type="password"
                      className="mt-1.5"
                      value={passwordForm.next}
                      onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="settings-confirm">Confirm new password</Label>
                    <Input
                      id="settings-confirm"
                      type="password"
                      className="mt-1.5"
                      value={passwordForm.confirm}
                      onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={() => void handlePassword()} disabled={passwordLoading}>
                  {passwordLoading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Update password
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>Profile visibility</CardTitle>
                <CardDescription>Who can view your public profile.</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={profileForm.visibility}
                  onValueChange={(value) => {
                    setProfileForm({ ...profileForm, visibility: value });
                    if (user) {
                      void updateProfile(user.id, { visibility: value })
                        .then(() => toast({ title: "Visibility updated" }))
                        .catch(() => toast({ title: "Update failed", variant: "destructive" }));
                    }
                  }}
                >
                  {[
                    { value: "public", label: "Public", description: "Anyone can view your profile." },
                    { value: "connections", label: "Connections", description: "School staff and linked accounts only." },
                    { value: "private", label: "Private", description: "Only you can view your profile." },
                  ].map((option) => (
                    <div key={option.value} className="flex items-start gap-3 rounded-lg border p-3">
                      <RadioGroupItem value={option.value} id={`privacy-${option.value}`} className="mt-0.5" />
                      <div>
                        <Label htmlFor={`privacy-${option.value}`} className="font-medium">
                          {option.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <RoleOnboardingWizard
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        profile={profile}
        onCompleted={() => {
          setShowOnboarding(false);
          void refreshProfile();
        }}
      />
    </div>
  );
};

export default Settings;
