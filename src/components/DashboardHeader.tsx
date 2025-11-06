import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
interface DashboardHeaderProps {
  profile: any;
  onSignOut: () => void;
}
export default function DashboardHeader({
  profile,
  onSignOut
}: DashboardHeaderProps) {
  const location = useLocation();
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };
  const isActive = (path: string) => location.pathname === path;
  return <header className="w-full bg-background/70 backdrop-blur-md border-b sticky top-0 z-50 transition-colors duration-500">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <Logo />

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          
          <Link to={`/gallery/user/${profile.id}`} className={`hover:text-primary transition-colors ${isActive(`/gallery/user/${profile.id}`) ? 'text-primary font-medium' : ''}`}>
            Gallery
          </Link>
          <Link to={`/projects/${profile.id}`} className={`hover:text-primary transition-colors ${isActive(`/projects/${profile.id}`) ? 'text-primary font-medium' : ''}`}>
            Projects
          </Link>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                    {profile?.full_name ? getInitials(profile.full_name) : <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile?.full_name || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {profile?.role || "Student"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>;
}