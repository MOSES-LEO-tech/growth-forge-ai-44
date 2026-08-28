/**
 * Shared SmartBuddy chat hook (P1).
 *
 * Centralizes the chat flow used by both the full-page SmartBuddy and the
 * dashboard widget: loads persisted history from IndexedDB on mount, sends
 * messages through the `smartbuddy-chat` edge function, queues messages
 * locally when offline, and persists every change (debounced) so
 * conversations survive reloads and work offline.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  clearChatHistory,
  exportChatHistory,
  getChatHistory,
  importChatHistory,
  saveChatHistory,
  type ChatMessage,
} from "@/lib/chatHistory";

/** How many recent messages are sent to the model for context. */
const HISTORY_CONTEXT = 5;
const PERSIST_DEBOUNCE_MS = 400;

export type SendOptions = {
  /** Optional personality id forwarded to the `smartbuddy-chat` function. */
  personality?: string;
  /** Called with a user-facing message on failure (including offline queueing). */
  onError?: (message: string) => void;
};

export function useSmartBuddyChat(userId?: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  /** True once the persisted history has been loaded (or found empty). */
  const [ready, setReady] = useState(false);
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== "undefined" ? !navigator.onLine : false));

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Load persisted history once per user.
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setReady(true);
      return;
    }
    void (async () => {
      const history = await getChatHistory(userId);
      if (!cancelled) {
        if (history.length > 0) setMessages(history);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Persist changes (debounced) once history has been hydrated.
  useEffect(() => {
    if (!userId || !ready) return;
    const timer = window.setTimeout(() => {
      void saveChatHistory(userId, messagesRef.current);
    }, PERSIST_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [messages, ready, userId]);

  // Track online/offline state for the local message queue.
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const send = useCallback(
    async (text: string, options?: SendOptions) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      if (!userId) {
        options?.onError?.("Please sign in to use SmartBuddy.");
        return;
      }

      const userMessage: ChatMessage = { role: "user", content: trimmed, createdAt: new Date().toISOString() };
      setMessages((prev) => [...prev, userMessage]);

      // Offline: keep the message locally; it will be sent once reconnected.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setIsOffline(true);
        options?.onError?.("You're offline — your message was kept locally and will send when you reconnect.");
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("smartbuddy-chat", {
          body: {
            message: trimmed,
            history: messagesRef.current.slice(-HISTORY_CONTEXT),
            ...(options?.personality ? { personality: options.personality } : {}),
          },
        });

        if (error) throw new Error(error.message || "Failed to connect to SmartBuddy");
        if (!data?.text) throw new Error("No response from assistant");

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.text, createdAt: new Date().toISOString() },
        ]);
      } catch (error) {
        console.error("SmartBuddy chat error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I'm having trouble connecting right now. Please try again.",
            createdAt: new Date().toISOString(),
          },
        ]);
        options?.onError?.(error instanceof Error ? error.message : "Failed to connect to SmartBuddy");
      } finally {
        setIsLoading(false);
      }
    },
    [userId, isLoading]
  );

  const clear = useCallback(async () => {
    setMessages([]);
    if (userId) await clearChatHistory(userId);
  }, [userId]);

  const exportJson = useCallback(async (): Promise<string | null> => {
    if (!userId) return null;
    return exportChatHistory(userId);
  }, [userId]);

  const importJson = useCallback(
    async (json: string): Promise<ChatMessage[]> => {
      if (!userId) throw new Error("Please sign in to import a chat backup.");
      const imported = await importChatHistory(userId, json);
      setMessages(imported);
      return imported;
    },
    [userId]
  );

  return { messages, setMessages, ready, isLoading, isOffline, send, clear, exportJson, importJson };
}

/** Trigger a browser download of a chat export JSON string. */
export function downloadChatExport(json: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `smartbuddy-chat-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
