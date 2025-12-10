import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Download, Image as ImageIcon } from "lucide-react";
import { ChatMessage, chatService } from "@/services/chatService";

interface MessageViewProps {
  conversationId: string;
  currentUserId: string;
  messages: ChatMessage[];
  loading: boolean;
  onRefresh?: () => void;
}

export function MessageView({
  conversationId,
  currentUserId,
  messages,
  loading,
}: MessageViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [downloadingMessageId, setDownloadingMessageId] = useState<string | null>(null);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    const scrollArea = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (scrollArea) {
      setTimeout(() => {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }, 0);
    }
  }, [messages]);

  const handleDownloadFile = async (message: ChatMessage) => {
    try {
      setDownloadingMessageId(message.id);
      const response = await chatService.downloadFile(message.id);
      if (!response.ok) throw new Error("Failed to download file");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = message.file_name || "file";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading file:", err);
    } finally {
      setDownloadingMessageId(null);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ontem";
    } else {
      return date.toLocaleDateString("pt-PT");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="h-full w-full">
      <div className="space-y-4 p-4">
        {messages.length === 0 ? (
          <div className="flex h-96 items-center justify-center">
            <p className="text-sm text-muted-foreground">Nenhuma mensagem nesta conversa</p>
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.sender_id === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    {getInitials(message.sender_name)}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={`flex flex-col gap-1 max-w-xs ${
                    isCurrentUser ? "items-end" : "items-start"
                  }`}
                >
                  {!isCurrentUser && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {message.sender_name}
                    </span>
                  )}

                  <div
                    className={`rounded-lg px-3 py-2 ${
                      isCurrentUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.message_type === "photo" && message.file_name ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          <span className="text-xs font-medium">Foto</span>
                        </div>
                        <button
                          onClick={() => handleDownloadFile(message)}
                          disabled={downloadingMessageId === message.id}
                          className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity disabled:opacity-50"
                        >
                          {downloadingMessageId === message.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          {message.file_name}
                          {message.file_size && (
                            <span className="text-xs">
                              ({(message.file_size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </button>
                      </div>
                    ) : (
                      <p className="break-words text-sm">{message.message}</p>
                    )}
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}
