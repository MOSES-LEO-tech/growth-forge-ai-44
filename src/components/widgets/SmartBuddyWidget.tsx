import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Settings, Bot } from "lucide-react";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

type Message = {
    role: "user" | "assistant";
    content: string;
};

type Personality = {
    id: string;
    name: string;
    emoji: string;
    greeting: string;
    description: string;
};

const personalities: Personality[] = [
    {
        id: "default",
        name: "SmartBuddy",
        emoji: "🌟",
        greeting: "Hey there, superstar! 👋 I'm SmartBuddy, your friendly AI companion. How can I help make your day awesome? 😄",
        description: "Friendly, encouraging, and supportive"
    },
    {
        id: "study-ninja",
        name: "Study Ninja",
        emoji: "🥷",
        greeting: "Ready to crush those goals? 🥷 I'm Study Ninja - let's get focused and make progress happen!",
        description: "Disciplined, focused, productivity-oriented"
    },
    // ... (Keep other personalities if needed, simplified for brevity)
];

interface SmartBuddyWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

export function SmartBuddyWidget({ className, defaultExpanded }: SmartBuddyWidgetProps) {
    const { user, session } = useAuth();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded || false);
    const [personality, setPersonality] = useState<string>(() => {
        return localStorage.getItem("smartbuddy-personality") || "default";
    });
    const [messages, setMessages] = useState<Message[]>([]);

    // Initialize messages only once or when personality changes
    useEffect(() => {
        const current = personalities.find(p => p.id === personality) || personalities[0];
        if (messages.length === 0) {
            setMessages([{
                role: "assistant",
                content: current.greeting,
            }]);
        }
    }, [personality]);

    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages, isExpanded]);

    const streamChat = async (userMessage: string) => {
        if (!user || !session) {
            toast.error("Please log in to use SmartBuddy");
            throw new Error("Not authenticated");
        }

        const { data, error } = await supabase.functions.invoke('smartbuddy-chat', {
            body: { 
                message: userMessage,
                personality: personality,
                history: messages.slice(-5) // Send last 5 messages for context
            }
        });

        if (error) {
            console.error("Chat error:", error);
            throw new Error(error.message || "Failed to chat");
        }

        if (data?.text) {
            setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
        } else {
            throw new Error("No response from assistant");
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        const messageText = input;
        setInput("");
        setIsLoading(true);

        // If sent from collapsed view, expand automatically
        if (!isExpanded) {
            // Logic to expand handled by parent if needed, or local toggle
            // But checking props, we rely on local state here for Dialog
            // We need to trigger the expand in the parent via callback usually, 
            // but ExpandableWidget handles its own state. 
            // We might need to pass a ref or control state to force expand.
            // For now, let's just send.
        }

        try {
            await streamChat(messageText);
        } catch (error) {
            console.error("Chat error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const currentPersonality = personalities.find(p => p.id === personality) || personalities[0];

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-4">
            <div className="flex-1 flex flex-col justify-end pb-2">
                <div className="bg-muted/50 rounded-lg p-3 text-sm mb-3 relative">
                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-muted/50 rotate-45"></div>
                    {currentPersonality.greeting.split('!')[0]}!
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                        {currentPersonality.emoji}
                    </div>
                    <span className="text-sm font-medium">{currentPersonality.name}</span>
                </div>
            </div>

            {/* Fake input to encourage clicking expand */}
            <div className="relative">
                <Input placeholder="Ask me anything..." className="pr-8 pointer-events-none" readOnly />
                <Send className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                        {currentPersonality.emoji}
                    </div>
                    <div>
                        <h3 className="font-bold">{currentPersonality.name}</h3>
                        <p className="text-xs text-muted-foreground">{currentPersonality.description}</p>
                    </div>
                </div>
                <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Settings className="w-5 h-5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Choose Personality</DialogTitle>
                        </DialogHeader>
                        <Select value={personality} onValueChange={setPersonality}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {personalities.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.emoji} {p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </DialogContent>
                </Dialog>
            </div>

            <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                <div className="space-y-4 pb-4">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.role === "user"
                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                    : "bg-muted rounded-tl-sm"
                                    }`}
                            >
                                <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" />
                                    <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:0.2s]" />
                                    <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:0.4s]" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="pt-4 mt-2 border-t">
                <div className="flex gap-2">
                    <Input
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        autoFocus
                    />
                    <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <ExpandableWidget
            title="Smart Buddy"
            icon={<Bot className="w-5 h-5 text-primary" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
            onExpandChange={setIsExpanded}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
