import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSmartBuddyChat, downloadChatExport } from "@/hooks/useSmartBuddyChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Send, User as UserIcon, Loader2, Sparkles, GraduationCap, Download, Upload, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import {
    PERSONALITIES,
    PERSONALITY_STORAGE_KEY,
    getPersonality,
} from "@/lib/smartBuddyPersonalities";

const SmartBuddy = () => {
    const { user } = useAuth();
    const { toast } = useToast();

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

    const [input, setInput] = useState("");
    const [personality, setPersonality] = useState<string>(() => {
        return localStorage.getItem(PERSONALITY_STORAGE_KEY) || "default";
    });
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Persist persona selection across reloads.
    useEffect(() => {
        localStorage.setItem(PERSONALITY_STORAGE_KEY, personality);
    }, [personality]);

    // Show the greeting once, when no persisted history exists.
    useEffect(() => {
        if (!ready || messages.length > 0) return;
        const current = getPersonality(personality);
        setMessages([{
            role: "assistant",
            content: current.greeting,
            createdAt: new Date().toISOString(),
        }]);
    }, [ready, messages.length, personality, setMessages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const messageText = input;
        setInput("");
        await send(messageText, {
            personality,
            onError: (message) => toast({ title: "SmartBuddy", description: message, variant: "destructive" }),
        });
    };

    const handleExport = async () => {
        const json = await exportJson();
        if (!json) {
            toast({ title: "Nothing to export yet", variant: "destructive" });
            return;
        }
        downloadChatExport(json);
        toast({ title: "Chat backup downloaded" });
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        try {
            const imported = await importJson(await file.text());
            toast({ title: `Imported ${imported.length} message${imported.length === 1 ? "" : "s"}` });
        } catch (error) {
            toast({ title: "Import failed", description: error instanceof Error ? error.message : "Failed to import chat backup.", variant: "destructive" });
        }
    };

    const handleClear = async () => {
        await clear();
        toast({ title: "Chat history cleared from this device" });
    };

    const currentPersonality = getPersonality(personality);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container max-w-4xl mx-auto pt-24 pb-8 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex flex-wrap items-center gap-4 mb-6">
                <Avatar className="h-14 w-14 border shrink-0">
                    <AvatarImage src={currentPersonality.avatarUrl} alt={currentPersonality.name} />
                    <AvatarFallback className="bg-primary/10 text-2xl">{currentPersonality.emoji}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        {currentPersonality.name} <Sparkles className="h-5 w-5 text-yellow-500" />
                    </h1>
                    <p className="text-muted-foreground">{currentPersonality.description}</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex-1 min-w-0 sm:flex-none">
                    <Select value={personality} onValueChange={setPersonality}>
                        <SelectTrigger className="w-full sm:w-[180px]" title="Choose personality">
                            <SelectValue placeholder="Personality" />
                        </SelectTrigger>
                        <SelectContent>
                            {PERSONALITIES.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    <span className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5 border">
                                            <AvatarImage src={p.avatarUrl} alt={p.name} />
                                            <AvatarFallback className="text-[10px]">{p.emoji}</AvatarFallback>
                                        </Avatar>
                                        {p.name}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={handleImport}
                    />
                    <Button variant="ghost" size="icon" onClick={handleExport} title="Export chat backup">
                        <Download className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Import chat backup">
                        <Upload className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={handleClear} title="Clear local chat history">
                        <Trash2 className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden border-2">
                <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-muted/20">
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <Avatar className="h-8 w-8 border">
                                            <AvatarImage src={currentPersonality.avatarUrl} alt={currentPersonality.name} />
                                            <AvatarFallback className="bg-primary/10 text-base">{currentPersonality.emoji}</AvatarFallback>
                                        </Avatar>
                                    )}

                                    <div className={`
                    max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                    ${msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground rounded-br-none'
                                            : 'bg-white border rounded-bl-none'}
                  `}>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    </div>

                                    {msg.role === 'user' && (
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                            <UserIcon className="h-5 w-5 text-slate-600" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                                <div className="flex gap-3 justify-start">
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarImage src={currentPersonality.avatarUrl} alt={currentPersonality.name} />
                                        <AvatarFallback className="bg-primary/10 text-base">{currentPersonality.emoji}</AvatarFallback>
                                    </Avatar>
                                    <div className="bg-card border rounded-2xl px-4 py-3 rounded-bl-none shadow-sm flex items-center">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>
                    </ScrollArea>

                    <div className="p-4 bg-background border-t">
                        <form onSubmit={handleSend} className="flex gap-2 relative">
                            <Input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Ask about scholarships, essay tips, or your portfolio..."
                                className="pr-12 py-6 rounded-full"
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-1 top-1 h-10 w-10 rounded-full"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </form>
                        <div className="text-center mt-2 space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                <GraduationCap className="h-3 w-3" /> SmartBuddy may make mistakes. Verify important info.
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                Stored privately on this device.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
        </div>
    );
};

export default SmartBuddy;
