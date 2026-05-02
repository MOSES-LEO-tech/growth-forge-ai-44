import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateProfile, uploadAvatar } from "@/lib/supabase/profile";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, UploadCloud } from "lucide-react";
import type { Profile } from "@/integrations/supabase/types";

interface ProfileSettingsModalProps {
  profile: Profile | null;
  onProfileUpdated: () => void | Promise<void>;
}

const listToText = (value?: string[] | null) => Array.isArray(value) ? value.join(", ") : "";

const textToList = (value: string) => {
  const list = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return list.length > 0 ? list : null;
};

const getInitials = (name?: string | null) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const ProfileSettingsModal = ({ profile, onProfileUpdated }: ProfileSettingsModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    bio: profile?.bio || "",
    grade_level: profile?.grade_level || "",
    class_name: profile?.class_name || "",
    age: profile?.age ? String(profile.age) : "",
    subjects: listToText(profile?.subjects),
    clubs: listToText(profile?.clubs),
    interests: listToText(profile?.interests),
    extracurriculars: listToText(profile?.extracurriculars),
  });
  const { toast } = useToast();

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || "",
      bio: profile?.bio || "",
      grade_level: profile?.grade_level || "",
      class_name: profile?.class_name || "",
      age: profile?.age ? String(profile.age) : "",
      subjects: listToText(profile?.subjects),
      clubs: listToText(profile?.clubs),
      interests: listToText(profile?.interests),
      extracurriculars: listToText(profile?.extracurriculars),
    });
    setAvatarPreview(profile?.avatar_url ?? null);
    setAvatarFile(null);
  }, [profile]);

  useEffect(() => {
    if (!avatarFile) return;

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Choose an image",
        description: "Profile pictures must be image files.",
        variant: "destructive",
      });
      return;
    }

    setAvatarFile(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;

    const age = form.age.trim() ? Number(form.age) : null;
    if (age !== null && (!Number.isInteger(age) || age < 3 || age > 120)) {
      toast({
        title: "Check age",
        description: "Age must be a whole number between 3 and 120.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        const avatarProfile = await uploadAvatar(profile.id, avatarFile);
        avatarUrl = avatarProfile?.avatar_url ?? avatarUrl;
      }

      await updateProfile(profile.id, {
        full_name: form.full_name.trim(),
        avatar_url: avatarUrl,
        bio: form.bio.trim() || null,
        grade_level: form.grade_level.trim() || null,
        class_name: form.class_name.trim() || null,
        age,
        subjects: textToList(form.subjects),
        clubs: textToList(form.clubs),
        interests: textToList(form.interests),
        extracurriculars: textToList(form.extracurriculars),
      });

      toast({
        title: "Profile updated",
        description: "Your recommendations now have better profile context.",
      });

      await onProfileUpdated();
      setOpen(false);
      setAvatarFile(null);
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex w-full cursor-pointer items-center">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </div>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Add optional details that help tailor projects, scholarships, and recommendations.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarPreview ?? undefined} alt={form.full_name || "Profile picture"} />
              <AvatarFallback className="text-lg">{getInitials(form.full_name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label htmlFor="profile-avatar">Profile picture</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="profile-avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="max-w-xs"
                  disabled={loading}
                />
                {avatarFile && (
                  <span className="text-xs text-muted-foreground">{avatarFile.name}</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={form.full_name}
                onChange={(event) => updateField("full_name", event.target.value)}
                placeholder="Enter your full name"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grade level</Label>
              <Input
                id="gradeLevel"
                value={form.grade_level}
                onChange={(event) => updateField("grade_level", event.target.value)}
                placeholder="Grade 10"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="className">Class / homeroom</Label>
              <Input
                id="className"
                value={form.class_name}
                onChange={(event) => updateField("class_name", event.target.value)}
                placeholder="10B"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min={3}
                max={120}
                value={form.age}
                onChange={(event) => updateField("age", event.target.value)}
                placeholder="16"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subjects">Subjects</Label>
              <Input
                id="subjects"
                value={form.subjects}
                onChange={(event) => updateField("subjects", event.target.value)}
                placeholder="Biology, Literature, Music"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clubs">Clubs</Label>
              <Input
                id="clubs"
                value={form.clubs}
                onChange={(event) => updateField("clubs", event.target.value)}
                placeholder="Robotics, Debate, Band"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interests">Interests</Label>
              <Input
                id="interests"
                value={form.interests}
                onChange={(event) => updateField("interests", event.target.value)}
                placeholder="Design, coding, community service"
                disabled={loading}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="extracurriculars">Extracurriculars</Label>
              <Input
                id="extracurriculars"
                value={form.extracurriculars}
                onChange={(event) => updateField("extracurriculars", event.target.value)}
                placeholder="Varsity soccer, student council, choir"
                disabled={loading}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(event) => updateField("bio", event.target.value)}
                placeholder="Tell teachers, parents, and reviewers what you are working toward..."
                rows={4}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !profile}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSettingsModal;
