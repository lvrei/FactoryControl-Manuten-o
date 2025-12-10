import { useEffect, useState } from "react";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConversationList } from "@/components/chat/ConversationList";
import { MessageView } from "@/components/chat/MessageView";
import { MessageInput } from "@/components/chat/MessageInput";
import { NewConversationDialog } from "@/components/chat/NewConversationDialog";
import { ChatMessage, chatService } from "@/services/chatService";

export default function ChatPage() {
  const user = authService.getCurrentUser();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newConversationDialogOpen, setNewConversationDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Load messages when conversation changes
  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        setMessagesLoading(true);
        setError(null);
        const data = await chatService.getMessages(selectedConversationId);
        setMessages(data);
      } catch (err: any) {
        console.error("Error loading messages:", err);
        setError(err.message || "Erro ao carregar mensagens");
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();

    // Poll for new messages every 3 seconds
    const interval = setInterval(loadMessages, 3000);

    return () => clearInterval(interval);
  }, [selectedConversationId]);

  const handleSendMessage = async (message: string) => {
    if (!selectedConversationId || !user?.id) return;

    try {
      setSendingMessage(true);
      await chatService.sendMessage(selectedConversationId, user.id, message);
      // Reload messages
      const data = await chatService.getMessages(selectedConversationId);
      setMessages(data);
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Erro ao enviar mensagem");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendPhoto = async (file: File) => {
    if (!selectedConversationId || !user?.id) return;

    try {
      setSendingMessage(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = (e.target?.result as string).split(",")[1];
          await chatService.sendPhotoMessage(
            selectedConversationId,
            user.id,
            file.name,
            file.type,
            file.size,
            base64,
          );
          // Reload messages
          const data = await chatService.getMessages(selectedConversationId);
          setMessages(data);
        } catch (err: any) {
          console.error("Error sending photo:", err);
          setError(err.message || "Erro ao enviar foto");
        } finally {
          setSendingMessage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("Error reading file:", err);
      setError("Erro ao ler ficheiro");
      setSendingMessage(false);
    }
  };

  const handleCreateConversation = async (
    title: string,
    participantIds: string[],
  ) => {
    if (!user?.id) return;

    try {
      const conversationId = await chatService.createConversation(
        user.id,
        participantIds,
        title,
      );
      setSelectedConversationId(conversationId);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      console.error("Error creating conversation:", err);
      setError(err.message || "Erro ao criar conversa");
    }
  };

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Chat</h1>
            <p className="text-sm text-muted-foreground">
              Comunique com os seus colegas
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mx-6 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-xs underline"
          >
            Fechar
          </button>
        </Alert>
      )}

      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* Conversation List */}
        <div className="w-64 shrink-0 overflow-hidden rounded-lg border">
          <ConversationList
            userId={user.id}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
            onNewConversation={() => setNewConversationDialogOpen(true)}
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* Main Chat Area */}
        {selectedConversationId ? (
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
            <div className="flex-1 overflow-hidden">
              <MessageView
                conversationId={selectedConversationId}
                currentUserId={user.id}
                messages={messages}
                loading={messagesLoading}
              />
            </div>
            <MessageInput
              onSendMessage={handleSendMessage}
              onSendPhoto={handleSendPhoto}
              disabled={sendingMessage || messagesLoading}
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">
                Selecione uma conversa ou crie uma nova
              </p>
              <Button onClick={() => setNewConversationDialogOpen(true)}>
                + Nova Conversa
              </Button>
            </div>
          </div>
        )}
      </div>

      <NewConversationDialog
        open={newConversationDialogOpen}
        onOpenChange={setNewConversationDialogOpen}
        currentUserId={user.id}
        onCreateConversation={handleCreateConversation}
      />
    </div>
  );
}
