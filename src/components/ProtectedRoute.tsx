import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Gate access if email is unverified, but allow access to the auth/reset page paths
  const isUnverified = !user.email_confirmed_at;
  const allowedPaths = ["/auth", "/reset-password"];
  if (isUnverified && !allowedPaths.includes(location.pathname)) {
    const handleResend = async () => {
      try {
        if (user.email) {
          await supabase.auth.resend({ type: "signup", email: user.email });
        }
      } catch (error) {
        // Silent fail; user can retry later
        console.error("Resend verification error", error);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold">Verify your email</h2>
          <p className="text-muted-foreground">
            We sent a verification link to {user.email}. Please verify your email to continue.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={handleResend}>Resend link</Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>I verified, refresh</Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

