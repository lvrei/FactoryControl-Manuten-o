import { useEffect, useCallback } from "react";
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
  useEffect(() => {
    if (!enabled || !conversationId) {
      return;
    }

    let eventSource: EventSource | null = null;

    const connectStream = () => {
      console.log("[CHAT] Connecting SSE stream for conversation:", conversationId);
      
      eventSource = new EventSource(
        `/api/chat/stream/${encodeURIComponent(conversationId)}`
      );

      eventSource.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[CHAT] Received message update:", data);
          onNewMessages(data.messages);
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
        setTimeout(connectStream, 3000);
      });

      eventSource.onerror = () => {
        console.warn("[CHAT] SSE error, reconnecting...");
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        setTimeout(connectStream, 3000);
      };
    };

    connectStream();

    return () => {
      if (eventSource) {
        console.log("[CHAT] Closing SSE stream");
        eventSource.close();
      }
    };
  }, [conversationId, enabled, onNewMessages]);
}
