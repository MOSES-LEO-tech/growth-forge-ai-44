import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Send, Settings, Bot, Maximize2, Download, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSmartBuddyChat, downloadChatExport } from "@/hooks/useSmartBuddyChat";
import {
    PERSONALITIES,
    PERSONALITY_STORAGE_KEY,
    getPersonality,
} from "@/lib/smartBuddyPersonalities";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface SmartBuddyWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

export function SmartBuddyWidget({ className, defaultExpanded }: SmartBuddyWidgetProps) {
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded || false);
    const [personality, setPersonality] = useState<string>(() => {
        return localStorage.getItem(PERSONALITY_STORAGE_KEY) || "default";
    });

    const {
        messages,
        setMessages,
        ready,
        isLoading,
        send,
        clear,
        exportJson,
        importJson,
    } = useSmartBuddyChat(user?.id);

    // Persist persona selection across reloads.
    useEffect(() => {
        localStorage.setItem(PERSONALITY_STORAGE_KEY, personality);
    }, [personality]);

    // Show the personality greeting once, when no persisted history exists.
    useEffect(() => {
        if (!ready) return;
        const current = getPersonality(personality);
        if (messages.length === 0) {
            setMessages([{
                role: "assistant",
                content: current.greeting,
                createdAt: new Date().toISOString(),
            }]);
        }
    }, [personality, ready, messages.length, setMessages]);

    const [input, setInput] = useState("");
    const [settingsOpen, setSettingsOpen] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const miniScrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
        if (miniScrollRef.current) {
            miniScrollRef.current.scrollTop = miniScrollRef.current.scrollHeight;
        }
    }, [messages, isExpanded]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const messageText = input;
        setInput("");
        await send(messageText, {
            personality,
            onError: (message) => toast.error(message),
        });
    };

    const handleExport = async () => {
        const json = await exportJson();
        if (!json) {
            toast.error("Nothing to export yet.");
            return;
        }
        downloadChatExport(json);
        toast.success("Chat backup downloaded");
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        try {
            const imported = await importJson(await file.text());
            toast.success(`Imported ${imported.length} message${imported.length === 1 ? "" : "s"}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to import chat backup.");
        }
    };

    const handleClear = async () => {
        await clear();
        toast.success("Chat history cleared from this device");
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const currentPersonality = getPersonality(personality);

    const hasConversation = messages.length > 1 || isLoading;

    return (
        <ExpandableWidget
            title="Smart Buddy"
            icon={<Bot className="w-5 h-5 text-primary" />}
            className={className}
            expanded={isExpanded}
            onExpandedChange={setIsExpanded}
            defaultExpanded={defaultExpanded}
            expandedContent={(
                <div className="flex h-full flex-col">
                    {/* Persona header + actions */}
                    <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b pb-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-10 w-10 border">
                                <AvatarImage src={currentPersonality.avatarUrl} alt={currentPersonality.name} />
                                <AvatarFallback className="bg-primary/10 text-xl">{currentPersonality.emoji}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <h3 className="font-semibold leading-tight truncate">{currentPersonality.name}</h3>
                                <p className="text-xs text-muted-foreground truncate">{currentPersonality.description}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/json"
                                className="hidden"
                                onChange={handleImport}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport} title="Export chat backup">
                                <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()} title="Import chat backup">
                                <Upload className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleClear} title="Clear local chat history">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Choose Personality</DialogTitle>
                                    </DialogHeader>
                                    <RadioGroup
                                        value={personality}
                                        onValueChange={setPersonality}
                                        className="gap-1"
                                    >
                                        {PERSONALITIES.map((p) => (
                                            <Label
                                                key={p.id}
                                                htmlFor={`personality-${p.id}`}
                                                className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                                            >
                                                <RadioGroupItem id={`personality-${p.id}`} value={p.id} className="mt-1" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-7 w-7 border">
                                                            <AvatarImage src={p.avatarUrl} alt={p.name} />
                                                            <AvatarFallback className="bg-primary/10 text-sm">{p.emoji}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium text-sm">{p.name}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                                                </div>
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Messages — scrollable middle */}
                    <ScrollArea className="flex-1 min-h-0 pr-4" ref={scrollAreaRef}>
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

                    {/* Input — pinned bottom */}
                    <div className="flex-shrink-0 pt-3 mt-2 border-t">
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
                        <p className="text-[11px] text-muted-foreground mt-2 text-center">
                            Stored privately on this device.
                        </p>
                    </div>
                </div>
            )}
        >
            <div className="flex flex-col h-full gap-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-8 w-8 border">
                            <AvatarImage src={currentPersonality.avatarUrl} alt={currentPersonality.name} />
                            <AvatarFallback className="bg-primary/10 text-lg">{currentPersonality.emoji}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <span className="text-sm font-medium block truncate">{currentPersonality.name}</span>
                            <span className="text-[11px] text-muted-foreground truncate block">{currentPersonality.description}</span>
                        </div>
                    </div>
                    {hasConversation && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                            onClick={() => setIsExpanded(true)}
                        >
                            Open full chat
                            <Maximize2 className="w-3 h-3 ml-1" />
                        </Button>
                    )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pr-1" ref={miniScrollRef}>
                    {!hasConversation ? (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm relative">
                            <div className="absolute -bottom-1 left-4 w-2 h-2 bg-muted/50 rotate-45"></div>
                            {currentPersonality.greeting}
                        </div>
                    ) : (
                        <div className="space-y-3 pb-1">
                            {messages.slice(-4).map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${message.role === "user"
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
                                    <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:0.2s]" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="Ask me anything..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        className="h-10"
                    />
                    <Button
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </ExpandableWidget>
    );
}
