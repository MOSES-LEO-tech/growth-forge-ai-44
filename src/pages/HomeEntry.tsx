import { useAuth } from "@/contexts/AuthContext";
import Index from "@/pages/Index";
import SignedInHome from "@/pages/SignedInHome";

/**
 * `/` for everyone.
 *
 * Guests get the marketing page; signed-in users get the showcase home. Keeping
 * this decision in one component means no route juggling and no flash of the
 * wrong page while auth resolves.
 */
const HomeEntry = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return user ? <SignedInHome /> : <Index />;
};

export default HomeEntry;
