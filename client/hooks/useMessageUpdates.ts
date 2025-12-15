import { useEffect, useCallback, useRef } from "react";
import { ChatMessage } from "@/services/chatService";

interface UseMessageUpdatesProps {
  conversationId: string | null;
  onNewMessages: (messages: ChatMessage[]) => void;
  enabled: boolean;
}

export function useMessageUpdates({
  conversationId,
  onNewMessages,
  enabled,
}: UseMessageUpdatesProps) {
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    if (!enabled || !conversationId) {
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectStream = () => {
      console.log("[CHAT] Connecting SSE stream for conversation:", conversationId);

      eventSource = new EventSource(
        `/api/chat/stream/${encodeURIComponent(conversationId)}`
      );

      eventSource.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[CHAT] Received update with", data.messages.length, "message(s), is_new:", data.is_new);

          if (data.is_new) {
            // Append new messages, but avoid duplicates by ID
            const existingIds = new Set(messagesRef.current.map(m => m.id));
            const newMessages = data.messages.filter(m => !existingIds.has(m.id));
            if (newMessages.length > 0) {
              messagesRef.current = [...messagesRef.current, ...newMessages];
              console.log("[CHAT] Added", newMessages.length, "new unique message(s)");
            }
          } else {
            // Initial load - replace entire list
            messagesRef.current = data.messages;
            console.log("[CHAT] Loaded", data.messages.length, "initial message(s)");
          }

          onNewMessages(messagesRef.current);
        } catch (err) {
          console.error("[CHAT] Failed to parse SSE message:", err);
        }
      });

      eventSource.addEventListener("error", (error) => {
        console.error("[CHAT] SSE connection error:", error);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Attempt to reconnect after 3 seconds
        reconnectTimeout = setTimeout(connectStream, 3000);
      });

      eventSource.onerror = () => {
        console.warn("[CHAT] SSE error, reconnecting...");
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        reconnectTimeout = setTimeout(connectStream, 3000);
      };
    };

    connectStream();

    return () => {
      if (eventSource) {
        console.log("[CHAT] Closing SSE stream");
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [conversationId, enabled, onNewMessages]);

  // Reset messages when conversation changes
  useEffect(() => {
    messagesRef.current = [];
  }, [conversationId]);
}
