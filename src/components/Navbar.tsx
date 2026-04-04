import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import SettingsDropdown from "@/components/SettingsDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";

const Navbar = () => {
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b transition-colors duration-500">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Logo />
        
        <div className="hidden md:flex items-center gap-8">
          <Link to="/features" className="text-sm font-medium hover:text-primary transition-colors">
            Features
          </Link>
          <Link to="/how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
            How It Works
          </Link>
          <Link to="/schools" className="text-sm font-medium hover:text-primary transition-colors">
            Schools
          </Link>
          <Link to="/scholarships" className="text-sm font-medium hover:text-primary transition-colors">
            Scholarships
          </Link>
          {user && (
            <Link to="/my-applications" className="text-sm font-medium hover:text-primary transition-colors">
              My Apps
            </Link>
          )}
          {user && (
            <Link to="/recommendations" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1.5 text-primary">
              <Sparkles className="w-4 h-4" />
              AI Insights
            </Link>
          )}
          <Link to="/contact" className="text-sm font-medium hover:text-primary transition-colors">
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <SettingsDropdown />
          {!user ? (
            <>
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button>Get Started</Button>
              </Link>
            </>
          ) : (
            <Link to="/dashboard">
              <Button>Dashboard</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
