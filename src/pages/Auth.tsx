import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PasswordStrength, calculatePasswordStrength } from "@/components/PasswordStrength";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrandMark } from "@/components/Logo";
import { brand } from "@/lib/brand";

type SignUpRole = "student" | "parent" | "teacher" | "admin";

const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["student", "parent", "teacher", "admin"])
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

interface FieldErrors {
  email?: string;
  password?: string;
  fullName?: string;
  schoolName?: string;
  schoolCode?: string;
}

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const Auth = () => {
  const { signIn, signUp, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "student" as SignUpRole,
    schoolName: "",
    schoolLocation: "",
    schoolCountry: "",
    schoolDescription: "",
    schoolLogoUrl: "",
    schoolCode: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Real-time validation
  const validateField = (field: string, value: string) => {
    try {
      if (activeTab === "signup") {
        if (field === "email") {
          z.string().email().parse(value);
        } else if (field === "password") {
          z.string().min(6).parse(value);
        } else if (field === "fullName") {
          z.string().min(2).parse(value);
        }
      } else {
        if (field === "email") {
          z.string().email().parse(value);
        } else if (field === "password") {
          z.string().min(1).parse(value);
        }
      }
      setErrors(prev => ({ ...prev, [field]: undefined }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: error.errors[0].message }));
      }
      return false;
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field as keyof typeof formData] as string);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const isFieldValid = (field: string) => {
    return touched[field] && !errors[field as keyof FieldErrors] && formData[field as keyof typeof formData];
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ email: true, password: true, fullName: true });

    try {
      const validated = signUpSchema.parse({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role
      });

      if (validated.role === "admin" && formData.schoolName.trim().length < 2) {
        setErrors(prev => ({ ...prev, schoolName: "School name is required" }));
        toast({
          title: "School required",
          description: "School admins must register one school during signup.",
          variant: "destructive"
        });
        return;
      }

      if (validated.role === "teacher" && formData.schoolCode.trim().length < 4) {
        setErrors(prev => ({ ...prev, schoolCode: "Enter the school code from your school admin" }));
        toast({
          title: "School code required",
          description: "Teachers need a school code so their school admin can approve them.",
          variant: "destructive"
        });
        return;
      }

      // Check password strength
      const { strength } = calculatePasswordStrength(validated.password);
      if (strength < 2) {
        toast({
          title: "Weak Password",
          description: "Please use a stronger password for better security.",
          variant: "destructive"
        });
        return;
      }

      setLoading(true);

      const extraMetadata =
        validated.role === "admin"
          ? {
              school_name: formData.schoolName.trim(),
              school_location: formData.schoolLocation.trim() || null,
              school_country: formData.schoolCountry.trim() || null,
              school_description: formData.schoolDescription.trim() || null,
              school_logo_url: formData.schoolLogoUrl.trim() || null,
            }
          : validated.role === "teacher"
            ? {
                school_join_code: formData.schoolCode.trim().toUpperCase(),
              }
            : {};

      const result = await signUp(
        validated.email,
        validated.password,
        validated.fullName,
        validated.role,
        extraMetadata
      );

      // Handle based on whether email confirmation is required
      if (result.requiresConfirmation) {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link. Please click the link in your email to activate your account.",
        });
        // Stay on auth page
      } else {
        // User is signed in without confirmation needed
        toast({
          title: "Account created!",
          description:
            validated.role === "admin" || validated.role === "teacher"
              ? "Your account was created and is waiting for approval."
              : `Welcome to ${brand.name}. Redirecting to your dashboard...`
        });
        navigate("/dashboard");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: FieldErrors = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof FieldErrors] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Error",
          description: getErrorMessage(error, "An error occurred during sign up"),
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ email: true, password: true });

    try {
      const validated = signInSchema.parse({
        email: formData.email,
        password: formData.password
      });

      setLoading(true);

      await signIn(validated.email, validated.password);

      toast({
        title: "Welcome back!",
        description: "Redirecting to your dashboard..."
      });

      navigate("/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: FieldErrors = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof FieldErrors] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Error",
          description: getErrorMessage(error, "Invalid email or password"),
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    toast({
      title: "Google Sign-in",
      description: "This requires backend configuration (GOOGLE_CLIENT_ID).",
    });
  };

  // Reset errors when switching tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setErrors({});
    setTouched({});
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground animate-pulse">Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl luxury-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BrandMark className="h-16 w-16" />
          </div>
          <CardTitle className="text-2xl">Welcome to {brand.name}</CardTitle>
          <CardDescription>Create your account or sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="student@school.edu"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      onBlur={() => handleBlur("email")}
                      disabled={loading}
                      className={cn(
                        errors.email && touched.email && "border-red-500",
                        isFieldValid("email") && "border-green-500"
                      )}
                      required
                    />
                    {isFieldValid("email") && (
                      <CheckCircle2 className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                    )}
                  </div>
                  {errors.email && touched.email && (
                    <p className="text-xs text-red-500">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      onBlur={() => handleBlur("password")}
                      disabled={loading}
                      className={cn(
                        errors.password && touched.password && "border-red-500",
                        isFieldValid("password") && "border-green-500"
                      )}
                      required
                    />
                    {isFieldValid("password") && (
                      <CheckCircle2 className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                    )}
                  </div>
                  {errors.password && touched.password && (
                    <p className="text-xs text-red-500">{errors.password}</p>
                  )}
                </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                  </svg>
                  Google
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <div className="relative">
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={(e) => handleChange("fullName", e.target.value)}
                      onBlur={() => handleBlur("fullName")}
                      disabled={loading}
                      className={cn(
                        errors.fullName && touched.fullName && "border-red-500",
                        isFieldValid("fullName") && "border-green-500"
                      )}
                      required
                    />
                    {isFieldValid("fullName") && (
                      <CheckCircle2 className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                    )}
                  </div>
                  {errors.fullName && touched.fullName && (
                    <p className="text-xs text-red-500">{errors.fullName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="student@school.edu"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      onBlur={() => handleBlur("email")}
                      disabled={loading}
                      className={cn(
                        errors.email && touched.email && "border-red-500",
                        isFieldValid("email") && "border-green-500"
                      )}
                      required
                    />
                    {isFieldValid("email") && (
                      <CheckCircle2 className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                    )}
                  </div>
                  {errors.email && touched.email && (
                    <p className="text-xs text-red-500">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      onBlur={() => handleBlur("password")}
                      disabled={loading}
                      className={cn(
                        errors.password && touched.password && "border-red-500"
                      )}
                      required
                    />
                  </div>
                  {errors.password && touched.password && (
                    <p className="text-xs text-red-500">{errors.password}</p>
                  )}
                  <PasswordStrength password={formData.password} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">I am a...</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as SignUpRole })}
                    disabled={loading}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="admin">School Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.role === "admin" && (
                  <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName">School Name</Label>
                      <Input
                        id="schoolName"
                        type="text"
                        placeholder="Lighthouse STEM Academy"
                        value={formData.schoolName}
                        onChange={(e) => handleChange("schoolName", e.target.value)}
                        disabled={loading}
                        required
                        className={cn(errors.schoolName && "border-red-500")}
                      />
                      {errors.schoolName && <p className="text-xs text-red-500">{errors.schoolName}</p>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="schoolLocation">Location</Label>
                        <Input
                          id="schoolLocation"
                          type="text"
                          placeholder="Kampala"
                          value={formData.schoolLocation}
                          onChange={(e) => handleChange("schoolLocation", e.target.value)}
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="schoolCountry">Country</Label>
                        <Input
                          id="schoolCountry"
                          type="text"
                          placeholder="Uganda"
                          value={formData.schoolCountry}
                          onChange={(e) => handleChange("schoolCountry", e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolDescription">School Description</Label>
                      <Input
                        id="schoolDescription"
                        type="text"
                        placeholder="A short description for the school profile"
                        value={formData.schoolDescription}
                        onChange={(e) => handleChange("schoolDescription", e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolLogoUrl">School Image URL</Label>
                      <Input
                        id="schoolLogoUrl"
                        type="url"
                        placeholder="https://images.pexels.com/..."
                        value={formData.schoolLogoUrl}
                        onChange={(e) => handleChange("schoolLogoUrl", e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      School admin accounts open after Super Admin approval. Each school admin can register one school.
                    </p>
                  </div>
                )}

                {formData.role === "teacher" && (
                  <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                    <Label htmlFor="schoolCode">School Code</Label>
                    <Input
                      id="schoolCode"
                      type="text"
                      placeholder="Enter the code from your school admin"
                      value={formData.schoolCode}
                      onChange={(e) => handleChange("schoolCode", e.target.value.toUpperCase())}
                      disabled={loading}
                      required
                      className={cn(errors.schoolCode && "border-red-500")}
                    />
                    {errors.schoolCode && <p className="text-xs text-red-500">{errors.schoolCode}</p>}
                    <p className="text-xs text-muted-foreground">
                      Your teacher dashboard opens after your school admin approves the request.
                    </p>
                  </div>
                )}

                {formData.role === "student" && (
                  <Alert>
                    <AlertDescription>
                      Students can join a school later from Settings using the school code from their school admin, or stay independent.
                    </AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
