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
          console.log("[CHAT] Received update with", data.messages.length, "message(s)");

          if (data.is_new) {
            // Append new messages to existing list
            messagesRef.current = [...messagesRef.current, ...data.messages];
          } else {
            // Initial load - replace entire list
            messagesRef.current = data.messages;
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

  // Update the ref when the conversation changes
  useEffect(() => {
    if (!conversationId) {
      messagesRef.current = [];
    }
  }, [conversationId]);
}
