import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "@/lib/supabase/profile";
import { requestSchoolConnection } from "@/lib/supabase/schoolSystem";
import {
  completeOnboarding,
  EDUCATION_SYSTEMS,
  GRADE_OPTIONS,
  linkParentToStudentByEmail,
} from "@/lib/onboarding";
import type { Profile, UserRole } from "@/integrations/supabase/types";

interface RoleOnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  onCompleted: () => void;
}

interface Step {
  key: string;
  title: string;
  description: string;
}

const STEP_SETS: Record<UserRole, Step[]> = {
  student: [
    { key: "basics", title: "Tell us about yourself", description: "Let's start with your name." },
    { key: "education", title: "Your education", description: "What you're studying helps us tailor your experience." },
    { key: "interests", title: "Your interests", description: "Optional, but great for recommendations." },
    { key: "school", title: "Connect a school", description: "Optional — enter a school join code if you have one." },
  ],
  parent: [
    { key: "basics", title: "Tell us about yourself", description: "Let's start with your name." },
    { key: "child", title: "Link your child", description: "Optional — enter your child's student email to link accounts." },
    { key: "school", title: "Connect a school", description: "Optional — enter a school join code if you have one." },
  ],
  teacher: [
    { key: "basics", title: "Tell us about yourself", description: "Let's start with your name." },
    { key: "school", title: "Connect your school", description: "Enter your school's join code to access school tools." },
    { key: "subjects", title: "What do you teach?", description: "Optional — helps match you to classes and approvals." },
  ],
  admin: [
    { key: "basics", title: "Tell us about yourself", description: "Let's start with your name." },
    { key: "school", title: "Connect your school", description: "Enter your school's join code. New schools are registered by Milestone support." },
  ],
  super_admin: [
    { key: "basics", title: "Tell us about yourself", description: "Let's start with your name." },
  ],
};

const listToText = (value?: string[] | null) => (Array.isArray(value) ? value.join(", ") : "");
const textToList = (value: string) => {
  const list = value.split(",").map((item) => item.trim()).filter(Boolean);
  return list.length > 0 ? list : null;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const RoleOnboardingWizard = ({ open, onClose, profile, onCompleted }: RoleOnboardingWizardProps) => {
  const { toast } = useToast();
  const role: UserRole = profile?.role ?? "student";
  const steps = STEP_SETS[role];

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    education_system: "",
    grade_level: "",
    class_name: "",
    subjects: "",
    interests: "",
    clubs: "",
    childEmail: "",
    schoolCode: "",
  });

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setForm({
      full_name: profile?.full_name || "",
      education_system: profile?.education_system || "",
      grade_level: profile?.grade_level || "",
      class_name: profile?.class_name || "",
      subjects: listToText(profile?.subjects),
      interests: listToText(profile?.interests),
      clubs: listToText(profile?.clubs),
      childEmail: "",
      schoolCode: "",
    });
  }, [open, profile]);

  if (!profile) return null;

  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const persist = async () => {
    if (!form.full_name.trim()) {
      toast({
        title: "Name required",
        description: "Add your full name to continue.",
        variant: "destructive",
      });
      return false;
    }

    setSaving(true);
    try {
      const updates: Partial<Profile> = {
        full_name: form.full_name.trim(),
      };
      if (role === "student") {
        updates.education_system = form.education_system || null;
        updates.grade_level = form.grade_level || null;
        updates.class_name = form.class_name || null;
        updates.subjects = textToList(form.subjects);
        updates.interests = textToList(form.interests);
        updates.clubs = textToList(form.clubs);
      }
      if (role === "teacher") {
        updates.subjects = textToList(form.subjects);
      }
      await updateProfile(profile.id, updates);

      if (form.schoolCode.trim()) {
        try {
          await requestSchoolConnection(form.schoolCode.trim());
          toast({ title: "School connection requested", description: "Your school admin will approve the connection." });
        } catch (error) {
          toast({
            title: "School code not accepted",
            description: getErrorMessage(error, "Double-check the code or skip this step."),
            variant: "destructive",
          });
        }
      }

      if (role === "parent" && form.childEmail.trim()) {
        try {
          await linkParentToStudentByEmail(form.childEmail.trim());
          toast({ title: "Child linked", description: "You're now connected to your child's account." });
        } catch (error) {
          toast({
            title: "Could not link child",
            description: getErrorMessage(error, "Check the email or ask your child to link you instead."),
            variant: "destructive",
          });
        }
      }

      await completeOnboarding(profile.id);
      onCompleted();
      return true;
    } catch (error) {
      toast({
        title: "Save failed",
        description: getErrorMessage(error, "Unable to save your details."),
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (step === steps.length - 1) {
      await persist();
      return;
    }
    setStep(step + 1);
  };

  const currentStep = steps[step];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{currentStep.title}</DialogTitle>
          <DialogDescription>{currentStep.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {currentStep.key === "basics" && (
            <div>
              <Label htmlFor="onboarding-name" className="text-sm font-medium">
                Full name
              </Label>
              <Input
                id="onboarding-name"
                className="mt-1.5"
                value={form.full_name}
                onChange={(event) => set({ full_name: event.target.value })}
                placeholder="Your full name"
              />
            </div>
          )}

          {currentStep.key === "education" && (
            <>
              <div>
                <Label htmlFor="onboarding-education" className="text-sm font-medium">
                  Education system
                </Label>
                <Select
                  value={form.education_system}
                  onValueChange={(value) => set({ education_system: value })}
                >
                  <SelectTrigger id="onboarding-education" className="mt-1.5">
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="onboarding-grade" className="text-sm font-medium">
                    Grade / year
                  </Label>
                  <Select
                    value={form.grade_level}
                    onValueChange={(value) => set({ grade_level: value })}
                  >
                    <SelectTrigger id="onboarding-grade" className="mt-1.5">
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
                  <Label htmlFor="onboarding-class" className="text-sm font-medium">
                    Class (optional)
                  </Label>
                  <Input
                    id="onboarding-class"
                    className="mt-1.5"
                    value={form.class_name}
                    onChange={(event) => set({ class_name: event.target.value })}
                    placeholder="e.g. 8A"
                  />
                </div>
              </div>
            </>
          )}

          {currentStep.key === "interests" && (
            <>
              <div>
                <Label htmlFor="onboarding-subjects" className="text-sm font-medium">
                  Subjects (comma-separated)
                </Label>
                <Input
                  id="onboarding-subjects"
                  className="mt-1.5"
                  value={form.subjects}
                  onChange={(event) => set({ subjects: event.target.value })}
                  placeholder="Math, Science, Art"
                />
              </div>
              <div>
                <Label htmlFor="onboarding-interests" className="text-sm font-medium">
                  Interests
                </Label>
                <Input
                  id="onboarding-interests"
                  className="mt-1.5"
                  value={form.interests}
                  onChange={(event) => set({ interests: event.target.value })}
                  placeholder="Robotics, Football, Debate"
                />
              </div>
              <div>
                <Label htmlFor="onboarding-clubs" className="text-sm font-medium">
                  Clubs
                </Label>
                <Input
                  id="onboarding-clubs"
                  className="mt-1.5"
                  value={form.clubs}
                  onChange={(event) => set({ clubs: event.target.value })}
                  placeholder="Chess club, Choir"
                />
              </div>
            </>
          )}

          {currentStep.key === "child" && (
            <div>
              <Label htmlFor="onboarding-child-email" className="text-sm font-medium">
                Child&apos;s student email
              </Label>
              <Input
                id="onboarding-child-email"
                type="email"
                className="mt-1.5"
                value={form.childEmail}
                onChange={(event) => set({ childEmail: event.target.value })}
                placeholder="student@example.com"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Your child must have an approved student account. They can also link you from their profile.
              </p>
            </div>
          )}

          {(currentStep.key === "school" || currentStep.key === "subjects") && (
            <>
              {currentStep.key === "school" && (
                <div>
                  <Label htmlFor="onboarding-school-code" className="text-sm font-medium">
                    School join code
                  </Label>
                  <Input
                    id="onboarding-school-code"
                    className="mt-1.5"
                    value={form.schoolCode}
                    onChange={(event) => set({ schoolCode: event.target.value })}
                    placeholder="e.g. ABC-1234"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    You can skip this and connect a school later from Settings.
                  </p>
                </div>
              )}
              {currentStep.key === "subjects" && (
                <div>
                  <Label htmlFor="onboarding-teacher-subjects" className="text-sm font-medium">
                    Subjects you teach (comma-separated)
                  </Label>
                  <Input
                    id="onboarding-teacher-subjects"
                    className="mt-1.5"
                    value={form.subjects}
                    onChange={(event) => set({ subjects: event.target.value })}
                    placeholder="Mathematics, Physics"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-2">
          {steps.map((stepItem, index) => (
            <div
              key={stepItem.key}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === step ? "w-7 bg-primary" : index < step ? "w-3 bg-primary/50" : "w-3 bg-muted"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} className="flex-1 sm:flex-none">
            Skip for now
          </Button>
          <Button onClick={() => void handleNext()} disabled={saving} className="flex-1 sm:flex-none">
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {step === steps.length - 1 ? "Finish" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoleOnboardingWizard;
