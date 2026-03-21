import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User as UserIcon, Loader2, Sparkles, GraduationCap } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const SmartBuddy = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hello! I'm SmartBuddy. I can help you with scholarship matching, portfolio advice, or just general study tips. How can I help you today?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('smartbuddy-chat', {
                body: { 
                    message: userMsg,
                    history: messages.slice(-5)
                }
            });

            if (error) throw error;

            if (data?.text) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
            } else {
                throw new Error("No response from assistant");
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to connect to SmartBuddy", variant: "destructive" });
            setMessages(prev => [
                ...prev, 
                { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again." }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container max-w-4xl mx-auto py-8 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-full bg-primary/10">
                    <Bot className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        SmartBuddy <Sparkles className="h-5 w-5 text-yellow-500" />
                    </h1>
                    <p className="text-muted-foreground">Your AI-powered academic assistant</p>
                </div>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden border-2">
                <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-slate-50/50">
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <Bot className="h-5 w-5 text-primary" />
                                        </div>
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
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <Bot className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="bg-white border rounded-2xl px-4 py-3 rounded-bl-none shadow-sm flex items-center">
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
                        <div className="text-center mt-2">
                            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                <GraduationCap className="h-3 w-3" /> SmartBuddy uses AI and may make mistakes. Verify important info.
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
