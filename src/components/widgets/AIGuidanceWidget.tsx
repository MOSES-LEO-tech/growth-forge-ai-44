import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Compass, Send, Bot, User, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface AIGuidanceWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
    childId?: number | null;
    parentPlan?: string;
}

type Message = { role: 'user' | 'assistant'; content: string; timestamp: Date };

const SUGGESTIONS = [
    "How can I help my child improve their study habits?",
    "Are there scholarships available for students in Africa?",
    "How can I support my child's career aspirations?",
    "What extracurricular activities complement STEM projects?",
];

export function AIGuidanceWidget({ className, defaultExpanded, childId, parentPlan = 'basic' }: AIGuidanceWidgetProps) {
    const { user, session } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<boolean>(false);

    const isLocked = parentPlan === 'basic';

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 50);
    }, []);

    const sendMessage = useCallback(async (text?: string) => {
        const msg = (text || input).trim();
        if (!msg || streaming || isLocked || !user || !session) return;

        setInput("");
        setError(null);

        const userMsg: Message = { role: 'user', content: msg, timestamp: new Date() };
        const botMsg: Message = { role: 'assistant', content: '', timestamp: new Date() };
        setMessages(prev => [...prev, userMsg, botMsg]);
        setStreaming(true);
        scrollToBottom();

        try {
            const { data, error: chatError } = await supabase.functions.invoke('parent-ai-guidance', {
                body: { 
                    message: msg,
                    childId: childId,
                    history: messages.slice(-5)
                }
            });

            if (chatError) throw chatError;

            if (data?.text) {
                setMessages(prev => {
                    const next = [...prev];
                    next[next.length - 1] = { ...next[next.length - 1], content: data.text };
                    return next;
                });
            } else {
                throw new Error("No response from assistant");
            }
            scrollToBottom();
        } catch (err: any) {
            setError(err?.message || 'Something went wrong. Please try again.');
            setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], content: '⚠️ Failed to get a response. Please try again.' };
                return next;
            });
        } finally {
            setStreaming(false);
        }
    }, [input, streaming, isLocked, childId, scrollToBottom, user, session, messages]);

    const CollapsedContent = () => (
        <div className="flex flex-col items-center justify-center gap-2 h-full text-center py-4">
                    <Compass className={`w-10 h-10 ${isLocked ? 'text-muted-foreground opacity-40' : 'text-primary'}`} />
            {isLocked ? (
                <>
                    <p className="text-sm text-muted-foreground">Guidance requires Plus plan</p>
                    <Badge variant="outline" className="text-xs"><Lock className="w-3 h-3 mr-1" />Upgrade to unlock</Badge>
                </>
            ) : (
                <p className="text-sm text-muted-foreground">Ask me anything about supporting your child's education</p>
            )}
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col h-[450px] gap-3 p-2">
            {isLocked ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Guidance is a Plus feature</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                            Upgrade to Plus to get personalized advice for supporting your child's academic journey.
                        </p>
                    </div>
                    <Button variant="outline" className="border-violet-400 text-violet-700 hover:bg-violet-50">
                        Upgrade to Plus
                    </Button>
                </div>
            ) : (
                <>
                    {/* Chat history */}
                    <ScrollArea className="flex-1 rounded-xl border bg-muted/30 p-3" ref={scrollRef as any}>
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 py-6">
                                <Bot className="w-12 h-12 text-violet-400 opacity-60" />
                                <p className="text-sm text-muted-foreground text-center">Hi! Ask me anything about supporting your child.</p>
                                <div className="flex flex-col gap-2 w-full max-w-sm">
                                    {SUGGESTIONS.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => sendMessage(s)}
                                            className="text-xs text-left px-3 py-2 rounded-lg border hover:bg-background/80 transition-colors"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                        {msg.role === 'assistant' && (
                                            <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                                                <Bot className="w-4 h-4 text-violet-600" />
                                            </div>
                                        )}
                                        <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-background border rounded-bl-none'}`}>
                                            {msg.content || (streaming && i === messages.length - 1 && <span className="inline-flex gap-1"><span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span><span className="animate-bounce" style={{ animationDelay: '120ms' }}>·</span><span className="animate-bounce" style={{ animationDelay: '240ms' }}>·</span></span>)}
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                                <User className="w-4 h-4 text-primary" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {error && <p className="text-xs text-destructive px-1">{error}</p>}

                    {/* Input row */}
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder="Ask about your child's education..."
                            disabled={streaming}
                            className="flex-1"
                        />
                        <Button size="icon" onClick={() => sendMessage()} disabled={!input.trim() || streaming}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <ExpandableWidget
            title="Guidance"
            icon={<Compass className="w-5 h-5 text-primary" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
