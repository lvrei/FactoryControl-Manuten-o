import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/config/api";

interface User {
  id: string;
  full_name: string;
  username: string;
  email?: string;
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onCreateConversation: (
    title: string,
    participantIds: string[],
  ) => Promise<void>;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  currentUserId,
  onCreateConversation,
}: NewConversationDialogProps) {
  const [title, setTitle] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await apiFetch("users");
      if (!response.ok) throw new Error("Failed to load users");
      const data = await response.json();
      setUsers(
        data.filter((user: User) => user.id !== currentUserId),
      );
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!title.trim() || selectedParticipants.length === 0) {
      alert("Por favor, adicione um título e selecione pelo menos um participante");
      return;
    }

    try {
      setLoading(true);
      await onCreateConversation(title, selectedParticipants);
      setTitle("");
      setSelectedParticipants([]);
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating conversation:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Conversa</DialogTitle>
          <DialogDescription>
            Crie uma nova conversa com os colegas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Conversa</Label>
            <Input
              id="title"
              placeholder="Ex: Manutenção Equipamento X"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Participantes</Label>
            <Input
              placeholder="Procurar participantes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading || usersLoading}
              className="text-sm"
            />
          </div>

          <ScrollArea className="h-64 border rounded-md p-3">
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum utilizador encontrado</p>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                    onClick={() => toggleParticipant(user.id)}
                  >
                    <Checkbox
                      checked={selectedParticipants.includes(user.id)}
                      onCheckedChange={() => toggleParticipant(user.id)}
                      disabled={loading}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedParticipants.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedParticipants.length} participante(s) selecionado(s)
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreateConversation}
            disabled={loading || selectedParticipants.length === 0 || !title.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Criar Conversa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
