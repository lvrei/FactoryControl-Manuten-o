import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Send, ImagePlus, X } from "lucide-react";
import { ChatMessage, chatService } from "@/services/chatService";
import { apiFetch } from "@/config/api";

interface User {
  id: string;
  full_name: string;
  username: string;
  email?: string;
}

interface ConversationWithUser {
  id: string;
  title: string;
  other_user_id: string;
  other_user_name: string;
  last_message?: string;
  last_message_time?: string;
  message_count: number;
}

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
}

export function ChatModal({
  open,
  onOpenChange,
  currentUserId,
}: ChatModalProps) {
  const [view, setView] = useState<"list" | "chat">("list");
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && view === "list") {
      loadUsersAndConversations();
    }
  }, [open, view]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    const scrollArea = scrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (scrollArea) {
      setTimeout(() => {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }, 0);
    }
  }, [messages]);

  const loadUsersAndConversations = async () => {
    try {
      setUsersLoading(true);

      // Load all users
      const usersResponse = await apiFetch("users");
      if (usersResponse.ok) {
        const usersData: User[] = await usersResponse.json();
        setUsers(usersData.filter((u) => u.id !== currentUserId));
      }

      // Load conversations
      const convsResponse = await chatService.getConversations(currentUserId);
      
      // Transform conversations to include other user info
      const transformedConvs: ConversationWithUser[] = [];
      for (const conv of convsResponse) {
        const participants = await chatService.getParticipants(conv.id);
        const otherParticipant = participants.find((p) => p.user_id !== currentUserId);
        
        if (otherParticipant) {
          transformedConvs.push({
            id: conv.id,
            title: conv.title,
            other_user_id: otherParticipant.user_id,
            other_user_name: otherParticipant.full_name || otherParticipant.username,
            last_message: conv.last_message,
            last_message_time: conv.last_message_time,
            message_count: conv.message_count,
          });
        }
      }
      
      setConversations(transformedConvs);
    } catch (err) {
      console.error("Error loading users/conversations:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSelectUser = async (userId: string) => {
    try {
      setLoading(true);
      setSelectedUserId(userId);

      // Check if conversation exists
      const existingConv = conversations.find(
        (c) => c.other_user_id === userId
      );

      if (existingConv) {
        setSelectedConversationId(existingConv.id);
        await loadMessages(existingConv.id);
      } else {
        // Create new conversation
        const conversationId = await chatService.createConversation(
          currentUserId,
          [userId],
          ""
        );
        setSelectedConversationId(conversationId);
        setMessages([]);
      }

      setView("chat");
    } catch (err) {
      console.error("Error selecting user:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setMessagesLoading(true);
      const data = await chatService.getMessages(conversationId);
      setMessages(data);
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId) return;

    try {
      setSendingMessage(true);
      await chatService.sendMessage(
        selectedConversationId,
        currentUserId,
        messageInput.trim()
      );
      setMessageInput("");
      await loadMessages(selectedConversationId);
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendPhoto = async (file: File) => {
    if (!selectedConversationId) return;

    try {
      setSendingMessage(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = (e.target?.result as string).split(",")[1];
          await chatService.sendPhotoMessage(
            selectedConversationId,
            currentUserId,
            file.name,
            file.type,
            file.size,
            base64
          );
          await loadMessages(selectedConversationId);
          if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (err) {
          console.error("Error sending photo:", err);
        } finally {
          setSendingMessage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error reading file:", err);
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString("pt-PT");
  };

  if (view === "chat" && selectedConversationId) {
    const selectedUser = selectedUserId
      ? users.find((u) => u.id === selectedUserId)
      : conversations.find((c) => c.id === selectedConversationId)?.other_user_name;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] flex flex-col h-[600px]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>{selectedUser}</DialogTitle>
              <DialogDescription>Conversa privada</DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setView("list");
                setSelectedConversationId(null);
                setSelectedUserId(null);
              }}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <ScrollArea ref={scrollRef} className="flex-1 border rounded-lg p-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">
                  Nenhuma mensagem
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isCurrentUser = msg.sender_id === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${
                        isCurrentUser ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-xs">
                          {getInitials(msg.sender_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`max-w-xs ${
                          isCurrentUser ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`rounded px-3 py-2 text-sm ${
                            isCurrentUser
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {msg.message_type === "photo" && msg.file_name ? (
                            <p className="text-xs">🖼️ {msg.file_name}</p>
                          ) : (
                            <p className="break-words">{msg.message}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="border-t pt-3 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Mensagem..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sendingMessage}
                className="text-sm"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSendPhoto(file);
                }}
                disabled={sendingMessage}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={sendingMessage}
                className="shrink-0"
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={sendingMessage || !messageInput.trim()}
                className="shrink-0"
              >
                {sendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] max-h-[600px]">
        <DialogHeader>
          <DialogTitle>Mensagens</DialogTitle>
          <DialogDescription>
            Selecione um utilizador ou conversa
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] border rounded-lg p-3">
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {/* Conversas Existentes */}
              {conversations.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground px-2 py-1">
                    CONVERSAS
                  </p>
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversationId(conv.id);
                        setSelectedUserId(conv.other_user_id);
                        loadMessages(conv.id);
                        setView("chat");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(conv.other_user_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {conv.other_user_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.last_message || "Nenhuma mensagem"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                  <div className="my-2 border-t" />
                </>
              )}

              {/* Utilizadores */}
              <p className="text-xs font-semibold text-muted-foreground px-2 py-1">
                UTILIZADORES
              </p>
              {users.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhum utilizador disponível
                </p>
              ) : (
                users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user.id)}
                    disabled={loading}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.username}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
