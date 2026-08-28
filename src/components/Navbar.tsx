import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import SettingsDropdown from "@/components/SettingsDropdown";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Features", to: "/features" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "Schools", to: "/schools" },
  { label: "Scholarships", to: "/scholarships" },
  { label: "Contact", to: "/contact" },
];

/**
 * Public marketing navbar. On every breakpoint the marketing links are an
 * inline scrollable strip — no hamburger. Signed-in app links live in the
 * dashboard navigation.
 */
const Navbar = () => {
  const { user } = useAuth();

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background">
      <div className="container mx-auto flex h-16 items-center gap-2 px-4">
        <Logo />

        <div className="flex flex-1 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
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
