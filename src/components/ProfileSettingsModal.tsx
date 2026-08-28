import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Cropper, { type Area, type Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { updateProfile, uploadAvatar } from "@/lib/supabase/profile";
import {
  disconnectMySchool,
  getMyPendingSchoolConnectionRequest,
  getSchoolById,
  requestSchoolConnection,
  type SchoolConnectionRequestWithProfile,
} from "@/lib/supabase/schoolSystem";
import { useToast } from "@/hooks/use-toast";
import { Building2, Check, Eye, Globe, KeyRound, Link2, Loader2, Lock, Unlink, UploadCloud, ZoomIn, ZoomOut } from "lucide-react";
import { PasswordStrength, calculatePasswordStrength } from "./PasswordStrength";
import { useAuth } from "@/contexts/AuthContext";
import type { Profile, School } from "@/integrations/supabase/types";

interface ProfileSettingsModalProps {
  profile: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated: () => void | Promise<void>;
}

const listToText = (value?: string[] | null) => Array.isArray(value) ? value.join(", ") : "";

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const textToList = (value: string) => {
  const list = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return list.length > 0 ? list : null;
};

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

const getInitials = (name?: string | null) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Renders the selected crop area from react-easy-crop onto a 256x256 canvas,
// producing the square PNG that gets uploaded as the profile avatar.
const createCroppedImage = (imageSrc: string, pixelCrop: Area): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas is not supported in this browser."));
        return;
      }
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not export the cropped image."))),
        "image/png"
      );
    };
    image.onerror = () => reject(new Error("Could not load the selected image."));
    image.src = imageSrc;
  });

const ProfileSettingsModal = ({ profile, open, onOpenChange, onProfileUpdated }: ProfileSettingsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const [applyingCrop, setApplyingCrop] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [connectedSchool, setConnectedSchool] = useState<School | null>(null);
  const [pendingSchoolRequest, setPendingSchoolRequest] = useState<SchoolConnectionRequestWithProfile | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: "", newPassword: "", confirm: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const { changePassword } = useAuth();
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
    visibility: profile?.visibility || "public",
    timezone: profile?.timezone || "",
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
      visibility: profile?.visibility || "public",
      timezone: profile?.timezone || "",
    });
    setAvatarPreview(profile?.avatar_url ?? null);
    setAvatarFile(null);
    setPasswordForm({ current: "", newPassword: "", confirm: "" });
  }, [open, profile]);

  const loadSchoolConnectionState = useCallback(async () => {
    if (!profile || profile.role !== "student") return;

    setSchoolLoading(true);
    try {
      const [school, pendingRequest] = await Promise.all([
        profile.school_id ? getSchoolById(profile.school_id) : Promise.resolve(null),
        getMyPendingSchoolConnectionRequest(profile.id),
      ]);
      setConnectedSchool(school);
      setPendingSchoolRequest(pendingRequest);
    } catch (error) {
      console.warn("Failed to load school connection state:", error);
    } finally {
      setSchoolLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!open || !profile || profile.role !== "student") return;
    void loadSchoolConnectionState();
  }, [loadSchoolConnectionState, open, profile]);

  useEffect(() => {
    if (!avatarFile) return;

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  // Revoke the cropping object URL when it is replaced or the modal unmounts.
  useEffect(() => {
    return () => {
      if (cropSource) URL.revokeObjectURL(cropSource);
    };
  }, [cropSource]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Choose an image",
        description: "Profile pictures must be image files.",
        variant: "destructive",
      });
      return;
    }

    setCropSource(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropping(true);
  };

  const cancelCrop = () => {
    setCropping(false);
    setCropSource(null);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const applyCrop = async () => {
    if (!cropSource || !croppedAreaPixels) return;

    setApplyingCrop(true);
    try {
      const blob = await createCroppedImage(cropSource, croppedAreaPixels);
      setAvatarFile(new File([blob], "avatar.png", { type: "image/png" }));
      cancelCrop();
      toast({
        title: "Picture ready",
        description: "Review it below, then save your profile.",
      });
    } catch (error) {
      toast({
        title: "Crop failed",
        description: getErrorMessage(error, "Unable to process the selected image."),
        variant: "destructive",
      });
    } finally {
      setApplyingCrop(false);
    }
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
        visibility: form.visibility || "public",
        timezone: form.timezone.trim() || null,
      });

      toast({
        title: "Profile updated",
        description: "Your recommendations now have better profile context.",
      });

      await onProfileUpdated();
      onOpenChange(false);
      setAvatarFile(null);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update profile. Please try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolConnect = async () => {
    if (!profile || profile.role !== "student") return;
    if (schoolCode.trim().length < 4) {
      toast({
        title: "Enter a school code",
        description: "Ask your school admin for the code, then enter it here.",
        variant: "destructive",
      });
      return;
    }

    setSchoolLoading(true);
    try {
      await requestSchoolConnection(schoolCode);
      setSchoolCode("");
      await loadSchoolConnectionState();
      toast({
        title: "Request sent",
        description: "Your school admin can now approve your connection request.",
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description: getErrorMessage(error, "Unable to request school connection."),
        variant: "destructive",
      });
    } finally {
      setSchoolLoading(false);
    }
  };

  const handleSchoolDisconnect = async () => {
    if (!profile || profile.role !== "student") return;

    setSchoolLoading(true);
    try {
      await disconnectMySchool();
      setConnectedSchool(null);
      setPendingSchoolRequest(null);
      await onProfileUpdated();
      toast({
        title: "School disconnected",
        description: "Your student account is independent again.",
      });
    } catch (error) {
      toast({
        title: "Disconnect failed",
        description: getErrorMessage(error, "Unable to disconnect your school."),
        variant: "destructive",
      });
    } finally {
      setSchoolLoading(false);
    }
  };

  const updatePasswordField = (field: "current" | "newPassword" | "confirm", value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangePassword = async () => {
    const current = passwordForm.current;
    const next = passwordForm.newPassword;
    const confirm = passwordForm.confirm;

    if (!current) {
      toast({
        title: "Enter your current password",
        description: "We need it to verify the change.",
        variant: "destructive",
      });
      return;
    }

    if (!next || next.length < 6) {
      toast({
        title: "New password too weak",
        description: "Use at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (next !== confirm) {
      toast({
        title: "Passwords do not match",
        description: "New password and confirmation must be identical.",
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(current, next);
      setPasswordForm({ current: "", newPassword: "", confirm: "" });
      toast({
        title: "Password updated",
        description: "Use your new password the next time you sign in.",
      });
    } catch (error) {
      toast({
        title: "Password change failed",
        description: getErrorMessage(error, "Unable to update your password. Please try again."),
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <div className="flex-1 space-y-2">
              {cropping && cropSource ? (
                <>
                  <Label>Adjust your profile picture</Label>
                  <div className="relative h-64 w-full max-w-sm overflow-hidden rounded-md bg-black/10">
                    <Cropper
                      image={cropSource}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      showGrid
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={(_croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <Slider
                      min={1}
                      max={3}
                      step={0.05}
                      value={[zoom]}
                      onValueChange={(values) => setZoom(values[0] ?? 1)}
                      className="flex-1"
                      disabled={applyingCrop}
                      aria-label="Zoom"
                    />
                    <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={cancelCrop} disabled={applyingCrop}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={applyCrop} disabled={!croppedAreaPixels || applyingCrop}>
                      {applyingCrop ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                      )}
                      Apply crop
                    </Button>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

          {profile?.role === "student" && (
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Building2 className="h-4 w-4" />
                    School Connection
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    To connect to your school, ask your school admin for the school code, enter it here, and wait for the admin approval.
                    You can also stay independent.
                  </p>
                </div>
                {schoolLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              </div>

              {connectedSchool ? (
                <div className="flex flex-col justify-between gap-3 rounded-md border bg-background p-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-medium">{connectedSchool.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[connectedSchool.location, connectedSchool.country].filter(Boolean).join(", ") || "Connected school"}
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={handleSchoolDisconnect} disabled={schoolLoading}>
                    <Unlink className="mr-2 h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              ) : pendingSchoolRequest ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Connection request pending for {pendingSchoolRequest.school?.name || "your selected school"}.
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={schoolCode}
                    onChange={(event) => setSchoolCode(event.target.value.toUpperCase())}
                    placeholder="Enter school code"
                    disabled={schoolLoading}
                  />
                  <Button type="button" onClick={handleSchoolConnect} disabled={schoolLoading}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Connect
                  </Button>
                </div>
              )}
            </div>
          )}

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

          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <Lock className="h-4 w-4" />
                Account & Security
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Update your password. You'll need your current password to confirm the change.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.current}
                  onChange={(event) => updatePasswordField("current", event.target.value)}
                  autoComplete="current-password"
                  disabled={passwordLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => updatePasswordField("newPassword", event.target.value)}
                  autoComplete="new-password"
                  disabled={passwordLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(event) => updatePasswordField("confirm", event.target.value)}
                  autoComplete="new-password"
                  disabled={passwordLoading}
                />
              </div>
            </div>

            {passwordForm.newPassword && <PasswordStrength password={passwordForm.newPassword} />}

            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Update password
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <Eye className="h-4 w-4" />
                Privacy
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Control who can view your profile and portfolio.
              </p>
            </div>

            <RadioGroup
              value={form.visibility}
              onValueChange={(value) => updateField("visibility", value)}
              disabled={loading}
            >
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="public" id="visibility-public" />
                <div>
                  <Label htmlFor="visibility-public" className="font-normal">Public</Label>
                  <p className="text-xs text-muted-foreground">Visible to everyone in the community.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="connections" id="visibility-connections" />
                <div>
                  <Label htmlFor="visibility-connections" className="font-normal">Connections only</Label>
                  <p className="text-xs text-muted-foreground">Visible to your connected school and followers.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="private" id="visibility-private" />
                <div>
                  <Label htmlFor="visibility-private" className="font-normal">Private</Label>
                  <p className="text-xs text-muted-foreground">Only you and admins can view your profile.</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <Globe className="h-4 w-4" />
                Language & Region
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Set your timezone so dates and reminders are accurate for you.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={form.timezone || "UTC"}
                onValueChange={(value) => updateField("timezone", value)}
                disabled={loading}
              >
                <SelectTrigger id="timezone" className="w-full sm:max-w-xs">
                  <SelectValue placeholder="Select a timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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
