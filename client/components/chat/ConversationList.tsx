import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus } from "lucide-react";
import { ChatConversation, chatService } from "@/services/chatService";

interface ConversationListProps {
  userId: string;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  refreshTrigger?: number;
}

export function ConversationList({
  userId,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  refreshTrigger = 0,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await chatService.getConversations(userId);
      setConversations(data);
    } catch (err) {
      console.error("Error loading conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [userId, refreshTrigger]);

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString("pt-PT");
  };

  return (
    <div className="flex h-full flex-col border-r">
      <div className="border-b p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversas</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={onNewConversation}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Input
          placeholder="Procurar conversas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p>Nenhuma conversa</p>
              <p className="text-xs">Clique + para criar uma nova</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                  selectedConversationId === conversation.id
                    ? "bg-primary/10"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {conversation.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.last_message || "Sem mensagens"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {conversation.message_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {conversation.message_count}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(conversation.last_message_time)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
