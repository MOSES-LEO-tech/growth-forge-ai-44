import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/supabase/notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  Bell,
  Building2,
  CheckCheck,
  FileText,
  Loader2,
  MessageSquare,
  Trophy,
} from "lucide-react";
import type { Database, Profile } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

interface NotificationBellProps {
  profile: Profile | null;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "school_connection_approved":
      return <Building2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />;
    case "project_submission":
      return <FileText className="h-4 w-4 text-blue-500" aria-hidden="true" />;
    case "achievement_submission":
      return <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />;
    case "parent_message":
      return <MessageSquare className="h-4 w-4 text-green-500" aria-hidden="true" />;
    case "deadline_reminder":
      return <AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
  }
};

// Relative time label; falls back to a short date rendered in the user's timezone.
const formatRelativeTime = (iso: string, timezone?: string | null) => {
  const date = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone || undefined,
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
};

export function NotificationBell({ profile }: NotificationBellProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getNotifications(user.id);
      setNotifications((data.notifications as Notification[]) || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
  }, [user]);

  // Live updates: new notifications for this user appear instantly.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notification-bell-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          setNotifications((prev) => [notification, ...prev].slice(0, 50));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification read", error);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications read", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full focus-ring"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-[360px]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-3 h-10 w-10 opacity-20" aria-hidden="true" />
              No notifications yet
            </div>
          ) : (
            <div className="p-1">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  onSelect={() => handleMarkRead(notification.id)}
                  className="flex cursor-pointer items-start gap-3 px-3 py-2.5 focus-ring"
                >
                  <span className="mt-0.5 shrink-0">{getNotificationIcon(notification.type)}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${notification.read ? "font-normal" : "font-medium"}`}>
                      {notification.title}
                    </span>
                    {notification.message && (
                      <span className="block truncate text-xs text-muted-foreground">{notification.message}</span>
                    )}
                    <span className="block text-[11px] text-muted-foreground/80">
                      {formatRelativeTime(notification.created_at, profile?.timezone)}
                    </span>
                  </span>
                  {!notification.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
