import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Settings } from "lucide-react";
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
  {
    id: "chill-mentor",
    name: "Chill Mentor",
    emoji: "🧘",
    greeting: "Hey, take a breath... you've got this. 🧘 I'm here to help you find your flow, no stress.",
    description: "Calm, wise, and laid-back"
  },
  {
    id: "hype-squad",
    name: "Hype Squad",
    emoji: "🎉",
    greeting: "YOOO LET'S GOOO! 🎉 I'm Hype Squad and I'm SO PUMPED to see you here! What amazing thing are we doing today?!",
    description: "Super energetic, cheerful, celebratory"
  },
  {
    id: "science-sage",
    name: "Science Sage",
    emoji: "🔬",
    greeting: "Greetings, curious mind! 🔬 I'm Science Sage. Ready to explore, experiment, and discover something fascinating?",
    description: "Analytical, curious, loves experiments"
  },
  {
    id: "creative-spark",
    name: "Creative Spark",
    emoji: "🎨",
    greeting: "Hey creative soul! 🎨 I'm Creative Spark - let's think outside the box and make something amazing together!",
    description: "Artistic, imaginative, innovative"
  },
  {
    id: "life-coach",
    name: "Life Coach",
    emoji: "💪",
    greeting: "Welcome, champion! 💪 I'm Life Coach - together we'll set goals, track progress, and unlock your potential!",
    description: "Motivational, goal-oriented, growth mindset"
  }
];

const SmartBuddy = () => {
  const [personality, setPersonality] = useState<string>(() => {
    return localStorage.getItem("smartbuddy-personality") || "default";
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    const current = personalities.find(p => p.id === personality) || personalities[0];
    return [{
      role: "assistant",
      content: current.greeting,
    }];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessages: Message[]) => {
    const CHAT_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/ai/chat`;

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        messages: userMessages,
        personality: personality
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        toast.error("Rate limits exceeded, please try again later.");
        throw new Error("Rate limit exceeded");
      }
      if (resp.status === 402) {
        toast.error("Payment required. Please add credits to continue.");
        throw new Error("Payment required");
      }
      throw new Error("Failed to start stream");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;
    let assistantContent = "";

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && prev.length > 1) {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch { }
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat(newMessages);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => prev.slice(0, -1));
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

  const handlePersonalityChange = (newPersonality: string) => {
    setPersonality(newPersonality);
    localStorage.setItem("smartbuddy-personality", newPersonality);
    const current = personalities.find(p => p.id === newPersonality) || personalities[0];
    setMessages([{
      role: "assistant",
      content: current.greeting,
    }]);
    setSettingsOpen(false);
    toast.success(`Switched to ${current.name}!`);
  };

  const currentPersonality = personalities.find(p => p.id === personality) || personalities[0];

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-secondary/10">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>{currentPersonality.emoji} {currentPersonality.name}</span>
          </div>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choose Your Buddy's Personality</DialogTitle>
                <DialogDescription>
                  Pick the vibe that matches your mood!
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Select value={personality} onValueChange={handlePersonalityChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {personalities.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <span>{p.emoji}</span>
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                    }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
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
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Ask me anything... 💭"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartBuddy;
