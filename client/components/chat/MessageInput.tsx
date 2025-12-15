import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, ImagePlus } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void>;
  onSendPhoto: (file: File) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({
  onSendMessage,
  onSendPhoto,
  disabled = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      setLoading(true);
      await onSendMessage(message.trim());
      setMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file is an image
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione uma imagem");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Imagem muito grande. Máximo 10MB.");
      return;
    }

    try {
      setLoading(true);
      await onSendPhoto(file);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Error sending photo:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border-t p-4 space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Digite uma mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled || loading}
            className="text-sm"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            disabled={disabled || loading}
            className="hidden"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || loading}
            className="shrink-0"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="sm"
          onClick={handleSendMessage}
          disabled={disabled || loading || !message.trim()}
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Pressione Enter para enviar ou use Shift+Enter para nova linha
      </p>
    </div>
  );
}
