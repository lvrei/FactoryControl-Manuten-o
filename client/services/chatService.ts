import { apiFetch } from "@/config/api";

export type ChatConversation = {
  id: string;
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message?: string;
  last_message_time?: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  message?: string;
  message_type: "text" | "photo";
  file_name?: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
};

export type ChatParticipant = {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  email?: string;
  joined_at: string;
};

class ChatService {
  async getConversations(userId: string): Promise<ChatConversation[]> {
    const r = await apiFetch(`chat/conversations?user_id=${encodeURIComponent(userId)}`);
    if (!r.ok) throw new Error("Falha ao listar conversas");
    return r.json();
  }

  async createConversation(
    userId: string,
    participantIds: string[],
    title?: string,
  ): Promise<string> {
    const r = await apiFetch("chat/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        participant_ids: participantIds,
        title: title,
      }),
    });
    if (!r.ok) throw new Error("Falha ao criar conversa");
    const j = await r.json();
    return j.id as string;
  }

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const r = await apiFetch(`chat/conversation/${conversationId}`);
    if (!r.ok) throw new Error("Falha ao carregar mensagens");
    const j = await r.json();
    return j.messages as ChatMessage[];
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    message?: string,
  ): Promise<string> {
    const r = await apiFetch("chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        sender_id: senderId,
        message: message,
        message_type: "text",
      }),
    });
    if (!r.ok) throw new Error("Falha ao enviar mensagem");
    const j = await r.json();
    return j.id as string;
  }

  async sendPhotoMessage(
    conversationId: string,
    senderId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    fileData: string,
  ): Promise<string> {
    const r = await apiFetch("chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        sender_id: senderId,
        message: null,
        message_type: "photo",
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        file_data: fileData,
      }),
    });
    if (!r.ok) throw new Error("Falha ao enviar foto");
    const j = await r.json();
    return j.id as string;
  }

  async downloadFile(messageId: string): Promise<Response> {
    return apiFetch(`chat/message/${messageId}/file`);
  }

  async getParticipants(conversationId: string): Promise<ChatParticipant[]> {
    const r = await apiFetch(`chat/conversation/${conversationId}/participants`);
    if (!r.ok) throw new Error("Falha ao carregar participantes");
    return r.json();
  }
}

export const chatService = new ChatService();
