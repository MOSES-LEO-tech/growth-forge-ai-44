import { useState, useEffect } from "react";
import { teacher } from "@/services/api";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Bell, Check, CheckCheck, ExternalLink, FileText, Trophy, MessageSquare, AlertCircle } from "lucide-react";

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string | null;
    resource_type: string | null;
    resource_id: number | null;
    read: boolean;
    created_at: string;
}

interface NotificationsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

export function NotificationsWidget({ className, defaultExpanded }: NotificationsWidgetProps) {
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await teacher.getNotifications({ unreadOnly: false, limit: 20 });
            setNotifications(response.data.notifications || []);
            setUnreadCount(response.data.unreadCount || 0);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkAsRead = async (id: number) => {
        try {
            await teacher.markNotificationRead(String(id));
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
        try {
            await teacher.markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
            toast({ title: "All notifications marked as read" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to mark all as read", variant: "destructive" });
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'project_submission':
                return <FileText className="w-4 h-4 text-blue-500" />;
            case 'achievement_submission':
                return <Trophy className="w-4 h-4 text-amber-500" />;
            case 'parent_message':
                return <MessageSquare className="w-4 h-4 text-green-500" />;
            case 'deadline_reminder':
                return <AlertCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Bell className="w-4 h-4 text-gray-500" />;
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        // Mark as read when clicked
        if (!notification.read) {
            handleMarkAsRead(notification.id);
        }

        // Navigate to resource if available
        if (notification.resource_type && notification.resource_id) {
            // Could implement navigation here
            console.log('Navigate to:', notification.resource_type, notification.resource_id);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
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
                    <p className="text-sm text-muted-foreground">Stay updated on student activity</p>
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
                    <Button size="sm" variant="outline" onClick={fetchNotifications} disabled={loading}>
                        Refresh
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 h-full pr-4">
                {loading ? (
                    <div className="text-center py-8">Loading...</div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                        <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    notification.read 
                                        ? 'bg-card hover:bg-accent' 
                                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                }`}
                            >
                                <div className="mt-0.5">
                                    {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-sm truncate">{notification.title}</p>
                                        {!notification.read && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    {notification.message && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                                            {notification.message}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatTime(notification.created_at)}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    {!notification.read && (
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 w-8 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkAsRead(notification.id);
                                            }}
                                        >
                                            <Check className="w-4 h-4" />
                                        </Button>
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
