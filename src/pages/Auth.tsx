import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/Logo";
import { brand } from "@/lib/brand";
import SignupOnboarding from "@/components/SignupOnboarding";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const Auth = () => {
  const { signIn, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const validateField = (field: "email" | "password", value: string) => {
    try {
      z.string().email().parse(value);
      if (field === "email") {
        setErrors((prev) => ({ ...prev, email: undefined }));
      } else {
        setErrors((prev) => ({ ...prev, password: undefined }));
      }
      return true;
    } catch {
      const message = field === "email" ? "Invalid email address" : "Password is required";
      setErrors((prev) => ({ ...prev, [field]: value ? message : undefined }));
      return field !== "email" ? value.length > 0 : false;
    }
  };

  const handleBlur = (field: "email" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, field === "email" ? email : password);
  };

  const handleChange = (field: "email" | "password", value: string) => {
    if (field === "email") setEmail(value);
    else setPassword(value);
    if (touched[field]) validateField(field, value);
  };

  const isFieldValid = (field: "email" | "password") =>
    Boolean(touched[field] && !errors[field] && (field === "email" ? email : password));

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    try {
      const validated = signInSchema.parse({ email, password });
      setLoading(true);
      await signIn(validated.email, validated.password);
      toast({ title: "Welcome back!", description: "Redirecting to your dashboard..." });
      navigate("/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const next: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === "email") next.email = err.message;
          if (err.path[0] === "password") next.password = err.message;
        });
        setErrors(next);
      } else {
        toast({ title: "Error", description: getErrorMessage(error, "Invalid email or password"), variant: "destructive" });
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
                      value={email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      onBlur={() => handleBlur("email")}
                      disabled={loading}
                      className={cn(errors.email && touched.email && "border-red-500", isFieldValid("email") && "border-green-500")}
                      required
                    />
                    {isFieldValid("email") && (
                      <CheckCircle2 className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                    )}
                  </div>
                  {errors.email && touched.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      onBlur={() => handleBlur("password")}
                      disabled={loading}
                      className={cn(errors.password && touched.password && "border-red-500")}
                      required
                    />
                  </div>
                  {errors.password && touched.password && <p className="text-xs text-red-500">{errors.password}</p>}
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
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
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
              <SignupOnboarding />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
