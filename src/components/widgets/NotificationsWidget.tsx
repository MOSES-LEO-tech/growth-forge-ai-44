import { useState, useEffect } from "react";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/supabase/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Bell, FileText, Trophy, MessageSquare, AlertCircle, CheckCheck, Check } from "lucide-react";
import type { Notification } from "@/types";

interface NotificationsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

export function NotificationsWidget({ className, defaultExpanded }: NotificationsWidgetProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getNotifications(user.id);
            setNotifications(data.notifications as Notification[] || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [user]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await markNotificationRead(id);
            setNotifications(prev => 
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            toast({ title: "Notification marked as read" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to mark notification as read", variant: "destructive" });
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!user) return;
        try {
            await markAllNotificationsRead(user.id);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
            toast({ title: "All notifications marked as read" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to mark all as read", variant: "destructive" });
        }
    };

    const CollapsedContent = () => (
        <div className="flex flex-col h-full items-center justify-center text-center gap-3">
            <div className="relative">
                <Bell className={`w-10 h-10 ${unreadCount > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                {unreadCount > 0 && (
                    <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full min-w-[18px] text-xs"
                    >
                        {unreadCount}
                    </Badge>
                )}
            </div>
            <div>
                <p className="text-2xl font-bold">{notifications.length}</p>
                <p className="text-sm text-muted-foreground">Notifications</p>
            </div>
            {unreadCount > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    {unreadCount} unread
                </p>
            )}
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col h-full gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Notifications</h3>
                    <p className="text-sm text-muted-foreground">Stay updated on activity</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleMarkAllAsRead}
                        disabled={unreadCount === 0}
                    >
                        <CheckCheck className="w-4 h-4 mr-1" />
                        Mark all read
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 h-full pr-4">
                {notifications.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                        <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    notification.read 
                                        ? 'bg-card hover:bg-accent' 
                                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{notification.title}</p>
                                    {notification.message && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                                            {notification.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );

    return (
        <ExpandableWidget
            title="Notifications"
            icon={<Bell className={`w-5 h-5 ${unreadCount > 0 ? "text-amber-500" : "text-gray-500"}`} />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
