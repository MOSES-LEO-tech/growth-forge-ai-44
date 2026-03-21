import { useState, useEffect, useCallback } from "react";
import { getMessages, sendMessage, markMessageRead } from "@/lib/supabase/messages";
import { useAuth } from "@/contexts/AuthContext";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { MessageSquare, Send, Inbox, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";

interface MessagingWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

type Message = {
    id: number;
    subject: string | null;
    content: string;
    read_status: boolean;
    created_at: string;
    sender_id: number;
    sender_name: string;
    sender_avatar: string | null;
    receiver_id: number;
    receiver_name: string;
    direction: 'sent' | 'received';
};

export function MessagingWidget({ className, defaultExpanded }: MessagingWidgetProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [composing, setComposing] = useState(false);
    const [receiverId, setReceiverId] = useState("");
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const [sending, setSending] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchMessages = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            setError(null);
            const data = await getMessages(user.id);
            setMessages(data || []);
        } catch (err: any) {
            setError(err?.message || "Failed to load messages.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchMessages(); }, [fetchMessages]);

    const handleSend = async () => {
        if (!user || !receiverId || !content.trim()) {
            toast({ title: "Incomplete message", description: "Recipient ID and message content are required.", variant: "destructive" });
            return;
        }
        try {
            setSending(true);
            await sendMessage(user.id, receiverId, content.trim(), subject.trim() || undefined);
            toast({ title: "Message sent!", description: "Your teacher will receive it shortly." });
            setComposing(false);
            setReceiverId(""); setSubject(""); setContent("");
            fetchMessages();
        } catch (err: any) {
            toast({ title: "Send failed", description: err?.message || "Please try again.", variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    const unread = messages.filter(m => m.direction === 'received' && !m.read_status).length;

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-3">
            {loading ? <Skeleton className="h-16 w-full" /> : error ? <p className="text-sm text-destructive">{error}</p> : (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-sky-500/10 text-center">
                            <div className="text-xl font-bold text-sky-600">{messages.length}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                        <div className="p-3 rounded-lg bg-orange-500/10 text-center">
                            <div className="text-xl font-bold text-orange-600">{unread}</div>
                            <div className="text-xs text-muted-foreground">Unread</div>
                        </div>
                    </div>
                    {messages[0] && (
                        <div className="text-xs text-muted-foreground border-t pt-2 truncate">
                            Latest: <span className="font-medium">{messages[0].subject || messages[0].content.substring(0, 40)}</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col gap-4 p-2">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-sky-500" />Inbox {unread > 0 && <Badge variant="destructive" className="text-xs">{unread} new</Badge>}
                </h4>
                <Button size="sm" onClick={() => setComposing(!composing)} variant={composing ? "secondary" : "default"}>
                    <Send className="w-3 h-3 mr-1" />New Message
                </Button>
            </div>

            {composing && (
                <div className="p-4 rounded-xl border bg-card space-y-3">
                    <Input placeholder="Teacher/Admin User ID" value={receiverId} onChange={e => setReceiverId(e.target.value)} />
                    <Input placeholder="Subject (optional)" value={subject} onChange={e => setSubject(e.target.value)} />
                    <Textarea placeholder="Your message..." value={content} onChange={e => setContent(e.target.value)} rows={4} />
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleSend} disabled={sending}>{sending ? "Sending..." : "Send"}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setComposing(false)}>Cancel</Button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : error ? (
                <div className="text-center py-8 text-destructive">{error}<button onClick={fetchMessages} className="block mt-2 mx-auto text-sm text-primary underline">Retry</button></div>
            ) : messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No messages yet. Start by messaging a teacher!</p>
                </div>
            ) : (
                <ScrollArea className="max-h-[350px]">
                    <div className="space-y-2 pr-2">
                        {messages.map(msg => (
                            <div key={msg.id} className={`p-3 rounded-xl border bg-card cursor-pointer hover:shadow-sm transition-shadow ${msg.direction === 'received' && !msg.read_status ? 'border-sky-300 bg-sky-50/50 dark:bg-sky-950/20' : ''}`}>
                                <div className="flex items-start justify-between gap-2" onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <ArrowRight className={`w-3 h-3 flex-shrink-0 ${msg.direction === 'sent' ? 'text-muted-foreground rotate-0' : 'text-sky-500 rotate-180'}`} />
                                            <span className="text-xs text-muted-foreground">{msg.direction === 'sent' ? `To: ${msg.receiver_name}` : `From: ${msg.sender_name}`}</span>
                                        </div>
                                        {msg.subject && <p className="font-medium text-sm truncate mt-0.5">{msg.subject}</p>}
                                        <p className="text-xs text-muted-foreground truncate">{msg.content.substring(0, 80)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-[10px] text-muted-foreground">{new Date(msg.created_at).toLocaleDateString()}</span>
                                        {expandedId === msg.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                </div>
                                {expandedId === msg.id && (
                                    <div className="mt-3 pt-3 border-t text-sm">{msg.content}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    );

    return (
        <ExpandableWidget
            title="Messages"
            icon={<MessageSquare className="w-5 h-5 text-sky-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
