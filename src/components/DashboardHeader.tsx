import { Button } from "@/components/ui/button";
import { Check, LogOut, Settings, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useTheme } from "@/contexts/ThemeProvider";
import { COLOR_THEMES, MODE_OPTIONS } from "@/lib/theme-options";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "./NotificationBell";
import CustomThemeCreator from "./CustomThemeCreator";
import NavLinkStrip from "@/components/NavLinkStrip";
import type { Profile } from "@/integrations/supabase/types";

interface DashboardHeaderProps {
  profile: Profile | null;
  onSignOut: () => void;
  onProfileUpdated?: () => void;
}

export default function DashboardHeader({ profile, onSignOut }: DashboardHeaderProps) {
  const { theme, setTheme, colorTheme, setColorTheme, customThemes, isTransitioning } = useTheme();
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-background"
      role="banner"
    >
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>

      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left: Logo */}
        <Logo />

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <NotificationBell profile={profile} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full focus-ring"
                aria-label={`User menu for ${profile?.full_name || 'User'}`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name || "User"} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {profile?.full_name ? getInitials(profile.full_name) : <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile?.full_name || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {profile?.role || "Student"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => navigate("/settings")}
                className="cursor-pointer focus-ring"
                aria-label="Open profile settings"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              
              {/* Appearance Settings Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <Settings className={`mr-2 h-4 w-4 transition-transform duration-500 ${isTransitioning ? 'rotate-180' : ''}`} />
                  <span>Appearance</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-56">
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Mode</DropdownMenuLabel>
                    {MODE_OPTIONS.map((mode) => (
                      <DropdownMenuItem
                        key={mode.value}
                        onClick={() => setTheme(mode.value)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <mode.icon className="h-4 w-4" />
                        <span>{mode.name}</span>
                        {theme === mode.value && (
                          <Check className="ml-auto h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Color Theme</DropdownMenuLabel>
                    {COLOR_THEMES.map((themeOption) => (
                      <DropdownMenuItem
                        key={themeOption.value}
                        onClick={() => setColorTheme(themeOption.value)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="flex gap-1 transition-transform group-hover:scale-110">
                          {themeOption.colors.map((color, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full shadow-sm"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span>{themeOption.name}</span>
                        {colorTheme === themeOption.value && (
                          <Check className="ml-auto h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    
                    {/* Custom themes */}
                    {customThemes.map((themeOption) => (
                      <DropdownMenuItem
                        key={themeOption.value}
                        onClick={() => setColorTheme(themeOption.value)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="flex gap-1 transition-transform group-hover:scale-110">
                          <div
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{ backgroundColor: themeOption.colors.primary }}
                          />
                          <div
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{ backgroundColor: themeOption.colors.secondary }}
                          />
                        </div>
                        <span>{themeOption.name}</span>
                        {colorTheme === themeOption.value && (
                          <Check className="ml-auto h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    
                    <DropdownMenuSeparator />
                    
                    {/* Custom Theme Creator */}
                    <div className="p-2">
                      <CustomThemeCreator />
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onSignOut}
                className="cursor-pointer focus-ring"
                aria-label="Sign out of your account"
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>

      {/* Role-aware primary navigation — the dashboard is the app hub */}
      <NavLinkStrip role={profile?.role} />
    </header>
  );
}
