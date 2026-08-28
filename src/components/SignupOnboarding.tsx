import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  GraduationCap,
  Loader2,
  School,
  Users,
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordStrength, calculatePasswordStrength } from "@/components/PasswordStrength";
import { applySignupOnboarding, EDUCATION_SYSTEMS, GRADE_OPTIONS } from "@/lib/onboarding";
import { z } from "zod";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/integrations/supabase/types";

type SignUpRole = "student" | "parent" | "teacher" | "admin";

const ROLES: { value: SignUpRole; label: string; description: string; icon: typeof GraduationCap }[] = [
  { value: "student", label: "Student", description: "Build a portfolio and track your growth.", icon: GraduationCap },
  { value: "parent", label: "Parent", description: "Follow your child's progress and achievements.", icon: Users },
  { value: "teacher", label: "Teacher", description: "Review work and support your students.", icon: Briefcase },
  { value: "admin", label: "School Admin", description: "Manage your school, people, and content.", icon: School },
];

const emailSchema = z.string().email("Enter a valid email address");
const passwordSchema = z.string().min(6, "Use at least 6 characters");
const nameSchema = z.string().min(2, "Use at least 2 characters");

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

interface SignupOnboardingProps {
  onDone?: () => void;
}

const SignupOnboarding = ({ onDone }: SignupOnboardingProps) => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<SignUpRole | null>(null);
  const [account, setAccount] = useState({ fullName: "", email: "", password: "" });
  const [details, setDetails] = useState({
    educationSystem: "",
    gradeLevel: "",
    className: "",
    interests: "",
    teacherSubjects: "",
    childEmail: "",
    schoolCode: "",
    schoolName: "",
    schoolLocation: "",
    schoolCountry: "",
    schoolDescription: "",
    schoolLogoUrl: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (patch: Partial<typeof details>) => setDetails((current) => ({ ...current, ...patch }));

  const validateAccount = (): boolean => {
    const nextErrors: Record<string, string> = {};
    const name = nameSchema.safeParse(account.fullName);
    const email = emailSchema.safeParse(account.email);
    const password = passwordSchema.safeParse(account.password);
    if (!name.success) nextErrors.fullName = name.error.errors[0].message;
    if (!email.success) nextErrors.email = email.error.errors[0].message;
    if (!password.success) nextErrors.password = password.error.errors[0].message;
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateAccount()) return;
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!role) return;

    if (!validateAccount()) {
      setStep(1);
      return;
    }
    if (role === "teacher" && details.schoolCode.trim().length < 4) {
      toast({
        title: "School code required",
        description: "Enter the code from your school admin so they can approve you.",
        variant: "destructive",
      });
      return;
    }
    if (role === "admin" && details.schoolName.trim().length < 2) {
      toast({ title: "School name required", description: "School admins register one school at signup.", variant: "destructive" });
      return;
    }
    const { strength } = calculatePasswordStrength(account.password);
    if (strength < 2) {
      toast({ title: "Weak password", description: "Use a stronger password for better security.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const extraMetadata: Record<string, string | null | undefined> = {};
      if (role === "admin") {
        extraMetadata.school_name = details.schoolName.trim();
        extraMetadata.school_location = details.schoolLocation.trim() || null;
        extraMetadata.school_country = details.schoolCountry.trim() || null;
        extraMetadata.school_description = details.schoolDescription.trim() || null;
        extraMetadata.school_logo_url = details.schoolLogoUrl.trim() || null;
      } else if (role === "teacher") {
        extraMetadata.school_join_code = details.schoolCode.trim().toUpperCase();
        extraMetadata.subjects = details.teacherSubjects.trim() || null;
      } else if (role === "student") {
        extraMetadata.education_system = details.educationSystem || null;
        extraMetadata.grade_level = details.gradeLevel || null;
        extraMetadata.class_name = details.className.trim() || null;
        extraMetadata.interests = details.interests.trim() || null;
      } else {
        extraMetadata.child_email = details.childEmail.trim() || null;
      }

      const result = await signUp(account.email, account.password, account.fullName.trim(), role, extraMetadata);

      if (result.requiresConfirmation) {
        toast({
          title: "Check your email",
          description: "We sent a confirmation link. Click it to activate your account.",
        });
      } else if (result.userId) {
        try {
          await applySignupOnboarding(result.userId, {
            role,
            educationSystem: details.educationSystem || null,
            gradeLevel: details.gradeLevel || null,
            className: details.className.trim() || null,
            subjects: role === "teacher" ? details.teacherSubjects : null,
            interests: role === "student" ? details.interests : null,
            schoolCode: role === "teacher" ? details.schoolCode : null,
            childEmail: role === "parent" ? details.childEmail : null,
          });
        } catch {
          // Non-blocking: account is created; the person can finish from Settings.
        }
        toast({
          title: "Account created!",
          description: role === "admin" || role === "teacher"
            ? "Your account is waiting for approval."
            : "Welcome to your new workspace.",
        });
        onDone?.();
        navigate("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Could not create account",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const steps = ["Your role", "Your account", "Your details"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-2">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                index === step ? "bg-primary text-primary-foreground" : index < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              {index + 1}
            </div>
            <span className={cn("text-xs", index === step ? "font-medium text-foreground" : "text-muted-foreground")}>
              {label}
            </span>
            {index < steps.length - 1 && <div className="mx-1 h-px w-4 bg-border" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Choose the account type that fits you.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLES.map(({ value, label, description, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                  role === value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/40 hover:bg-accent"
                )}
              >
                <Icon className={cn("h-5 w-5", role === value ? "text-primary" : "text-muted-foreground")} />
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="onboarding-name">Full name</Label>
            <Input
              id="onboarding-name"
              className={cn("mt-1.5", fieldErrors.fullName && "border-destructive")}
              value={account.fullName}
              onChange={(event) => setAccount({ ...account, fullName: event.target.value })}
              placeholder="John Doe"
              disabled={loading}
            />
            {fieldErrors.fullName && <p className="mt-1 text-xs text-destructive">{fieldErrors.fullName}</p>}
          </div>
          <div>
            <Label htmlFor="onboarding-email">Email</Label>
            <Input
              id="onboarding-email"
              type="email"
              className={cn("mt-1.5", fieldErrors.email && "border-destructive")}
              value={account.email}
              onChange={(event) => setAccount({ ...account, email: event.target.value })}
              placeholder="you@example.com"
              disabled={loading}
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>}
          </div>
          <div>
            <Label htmlFor="onboarding-password">Password</Label>
            <Input
              id="onboarding-password"
              type="password"
              className={cn("mt-1.5", fieldErrors.password && "border-destructive")}
              value={account.password}
              onChange={(event) => setAccount({ ...account, password: event.target.value })}
              disabled={loading}
            />
            {fieldErrors.password && <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>}
            <PasswordStrength password={account.password} />
          </div>
        </div>
      )}

      {step === 2 && role === "student" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="onboarding-education">Education system</Label>
              <Select value={details.educationSystem} onValueChange={(value) => set({ educationSystem: value })}>
                <SelectTrigger id="onboarding-education" className="mt-1.5">
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_SYSTEMS.map((system) => (
                    <SelectItem key={system} value={system}>{system}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="onboarding-grade">Grade / year</Label>
              <Select value={details.gradeLevel} onValueChange={(value) => set({ gradeLevel: value })}>
                <SelectTrigger id="onboarding-grade" className="mt-1.5">
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((grade) => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="onboarding-class">Class (optional)</Label>
              <Input id="onboarding-class" className="mt-1.5" value={details.className} onChange={(event) => set({ className: event.target.value })} placeholder="8A" disabled={loading} />
            </div>
            <div>
              <Label htmlFor="onboarding-interests">Interests (optional)</Label>
              <Input id="onboarding-interests" className="mt-1.5" value={details.interests} onChange={(event) => set({ interests: event.target.value })} placeholder="Robotics, Debate" disabled={loading} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">You can join a school later from Settings with a school code, or stay independent.</p>
        </div>
      )}

      {step === 2 && role === "parent" && (
        <div className="space-y-2">
          <Label htmlFor="onboarding-child-email">Link your child (optional)</Label>
          <Input
            id="onboarding-child-email"
            type="email"
            className="mt-1.5"
            value={details.childEmail}
            onChange={(event) => set({ childEmail: event.target.value })}
            placeholder="student@example.com"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Your child must have an approved student account. You can also link them later from Settings.
          </p>
        </div>
      )}

      {step === 2 && role === "teacher" && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="onboarding-school-code">School code</Label>
            <Input
              id="onboarding-school-code"
              className="mt-1.5"
              value={details.schoolCode}
              onChange={(event) => set({ schoolCode: event.target.value.toUpperCase() })}
              placeholder="Code from your school admin"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-muted-foreground">Your teacher dashboard opens after your school admin approves the request.</p>
          </div>
          <div>
            <Label htmlFor="onboarding-teacher-subjects">Subjects you teach (optional)</Label>
            <Input id="onboarding-teacher-subjects" className="mt-1.5" value={details.teacherSubjects} onChange={(event) => set({ teacherSubjects: event.target.value })} placeholder="Mathematics, Physics" disabled={loading} />
          </div>
        </div>
      )}

      {step === 2 && role === "admin" && (
        <div className="space-y-3">
          <div>
            <Label htmlFor="onboarding-school-name">School name</Label>
            <Input id="onboarding-school-name" className="mt-1.5" value={details.schoolName} onChange={(event) => set({ schoolName: event.target.value })} placeholder="Lighthouse STEM Academy" disabled={loading} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="onboarding-school-location">Location</Label>
              <Input id="onboarding-school-location" className="mt-1.5" value={details.schoolLocation} onChange={(event) => set({ schoolLocation: event.target.value })} placeholder="Kampala" disabled={loading} />
            </div>
            <div>
              <Label htmlFor="onboarding-school-country">Country</Label>
              <Input id="onboarding-school-country" className="mt-1.5" value={details.schoolCountry} onChange={(event) => set({ schoolCountry: event.target.value })} placeholder="Uganda" disabled={loading} />
            </div>
          </div>
          <div>
            <Label htmlFor="onboarding-school-description">Description</Label>
            <Input id="onboarding-school-description" className="mt-1.5" value={details.schoolDescription} onChange={(event) => set({ schoolDescription: event.target.value })} placeholder="A short description" disabled={loading} />
          </div>
          <div>
            <Label htmlFor="onboarding-school-logo">School image URL</Label>
            <Input id="onboarding-school-logo" className="mt-1.5" value={details.schoolLogoUrl} onChange={(event) => set({ schoolLogoUrl: event.target.value })} placeholder="https://..." disabled={loading} />
          </div>
          <p className="text-xs text-muted-foreground">School admin accounts open after Super Admin approval.</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={loading || step === 0}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        {step < 2 ? (
          <Button type="button" onClick={handleNext} disabled={step === 0 && !role}>
            Next <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={() => void handleSubmit()} disabled={loading}>
            {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Create account
          </Button>
        )}
      </div>
    </div>
  );
};

export default SignupOnboarding;
