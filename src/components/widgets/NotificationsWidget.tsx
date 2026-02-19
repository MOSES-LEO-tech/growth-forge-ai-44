import { useState, useEffect, useCallback } from "react";
import { parent as parentApi } from "@/services/api";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Bell, CheckCheck, Award, FolderOpen, MessageSquare, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface NotificationsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

type Notification = {
    id: number;
    type: string;
    title: string;
    body: string | null;
    read_status: boolean;
    reference_id: number | null;
    reference_type: string | null;
    created_at: string;
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
    achievement_verified: <Award className="w-4 h-4 text-amber-500" />,
    project_complete: <FolderOpen className="w-4 h-4 text-blue-500" />,
    message: <MessageSquare className="w-4 h-4 text-sky-500" />,
    event_reminder: <Calendar className="w-4 h-4 text-purple-500" />,
};

export function NotificationsWidget({ className, defaultExpanded }: NotificationsWidgetProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [marking, setMarking] = useState<number | null>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await parentApi.getNotifications();
            setNotifications(res.data?.notifications || []);
            setUnreadCount(res.data?.unreadCount || 0);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to load notifications.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    const handleMarkRead = useCallback(async (id: number) => {
        if (marking) return;
        try {
            setMarking(id);
            await parentApi.markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_status: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { /* silent */ } finally {
            setMarking(null);
        }
    }, [marking]);

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-3">
            {loading ? <Skeleton className="h-16 w-full" /> : error ? <p className="text-sm text-destructive">{error}</p> : (
                <>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                        <div>
                            <div className="text-lg font-bold">{unreadCount}</div>
                            <div className="text-xs text-muted-foreground">unread notifications</div>
                        </div>
                    </div>
                    {notifications[0] && (
                        <div className="text-xs text-muted-foreground border-t pt-2 truncate">
                            Latest: <span className="font-medium">{notifications[0].title}</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col gap-4 p-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{notifications.length} notifications, {unreadCount} unread</span>
                {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={fetchNotifications}>
                        <CheckCheck className="w-3 h-3 mr-1" />Refresh
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : error ? (
                <div className="text-center py-8 text-destructive">{error}<button onClick={fetchNotifications} className="block mt-2 mx-auto text-sm text-primary underline">Retry</button></div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No notifications yet</p>
                </div>
            ) : (
                <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2 pr-2">
                        {notifications.map(notif => (
                            <div
                                key={notif.id}
                                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${!notif.read_status ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20' : 'bg-card'}`}
                                onClick={() => !notif.read_status && handleMarkRead(notif.id)}
                            >
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                    {TYPE_ICONS[notif.type] || <Bell className="w-4 h-4 text-muted-foreground" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm ${!notif.read_status ? 'font-semibold' : 'font-medium'}`}>{notif.title}</p>
                                        {!notif.read_status && (
                                            <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />
                                        )}
                                    </div>
                                    {notif.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>}
                                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    );

    return (
        <ExpandableWidget
            title="Notifications"
            icon={<Bell className="w-5 h-5 text-orange-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
