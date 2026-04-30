import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import SettingsDropdown from "@/components/SettingsDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { Compass } from "lucide-react";

const navItems = [
  { label: "Features", to: "/features" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "Schools", to: "/schools" },
  { label: "Scholarships", to: "/scholarships" },
  { label: "Contact", to: "/contact" },
];

const Navbar = () => {
  const { user } = useAuth();

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Logo />

        <div className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          {user && (
            <>
              <Link to="/my-applications" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                My Apps
              </Link>
              <Link to="/recommendations" className="flex items-center gap-1.5 text-sm font-medium text-primary">
                <Compass className="h-4 w-4" />
                Guidance
              </Link>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <SettingsDropdown />
          {!user ? (
            <>
              <Button variant="ghost" asChild className="px-3 sm:px-4">
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button asChild className="whitespace-nowrap px-3 sm:px-4">
                <Link to="/auth">Get Started</Link>
              </Button>
            </>
          ) : (
            <Button asChild className="whitespace-nowrap px-3 sm:px-4">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
