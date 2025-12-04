import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Trash2,
  Download,
  FileText,
  File,
  Image,
  Eye,
} from "lucide-react";
import { apiFetch } from "@/config/api";
import { FilePreviewViewer } from "./FilePreviewViewer";

interface EquipmentFile {
  id: string;
  equipment_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface EquipmentFilesManagerProps {
  equipment_id: string;
  equipment_name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EquipmentFilesManager({
  equipment_id,
  equipment_name,
  open,
  onOpenChange,
}: EquipmentFilesManagerProps) {
  const [files, setFiles] = useState<EquipmentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<EquipmentFile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadFiles();
    }
  }, [open]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`equipment/${equipment_id}/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error("Erro ao carregar ficheiros:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar ficheiros",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.currentTarget.files;
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Tipo de ficheiro não permitido",
        description: "São permitidos: Imagens (JPG, PNG, GIF, WebP), PDF e Word",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Ficheiro muito grande",
        description: "O ficheiro não pode ter mais de 50MB",
      });
      return;
    }

    try {
      setUploading(true);
      const reader = new FileReader();

      reader.onload = async (event) => {
        const fileData = event.target?.result as string;
        const base64 = fileData.split(",")[1];

        const response = await apiFetch(
          `equipment/${equipment_id}/files`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type.split("/")[1],
              fileData: base64,
              mimeType: file.type,
            }),
          }
        );

        if (response.ok) {
          toast({
            title: "Ficheiro carregado",
            description: `${file.name} foi carregado com sucesso`,
          });
          loadFiles();
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Erro ao carregar ficheiro",
          });
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro ao carregar ficheiro:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar ficheiro",
      });
    } finally {
      setUploading(false);
      e.currentTarget.value = "";
    }
  };

  const handleDownload = async (file: EquipmentFile) => {
    try {
      const response = await apiFetch(
        `equipment/${equipment_id}/files/${file.id}/download`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.file_name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao fazer download do ficheiro",
        });
      }
    } catch (error) {
      console.error("Erro ao fazer download:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao fazer download do ficheiro",
      });
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Tem a certeza que deseja eliminar ${fileName}?`)) return;

    try {
      const response = await apiFetch(
        `equipment/${equipment_id}/files/${fileId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast({
          title: "Ficheiro eliminado",
          description: "Ficheiro removido com sucesso",
        });
        loadFiles();
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao eliminar ficheiro",
        });
      }
    } catch (error) {
      console.error("Erro ao eliminar ficheiro:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao eliminar ficheiro",
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (mimeType.includes("pdf")) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ficheiros do Equipamento</DialogTitle>
          <DialogDescription>{equipment_name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Section */}
          <div className="border-2 border-dashed border-border rounded-lg p-6">
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Clique para carregar ficheiro
                </span>
                <span className="text-xs text-muted-foreground">
                  Fotos, PDF, Word (máx. 50MB)
                </span>
              </div>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
                accept="image/*,.pdf,.doc,.docx"
              />
            </Label>
          </div>

          {/* Files List */}
          <div className="space-y-2">
            <h3 className="font-medium">Ficheiros ({files.length})</h3>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                A carregar...
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum ficheiro anexado
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="text-muted-foreground">
                      {getFileIcon(file.mime_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} •{" "}
                        {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewFile(file);
                          setShowPreview(true);
                        }}
                        title="Pré-visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(file)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(file.id, file.file_name)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {previewFile && (
      <FilePreviewViewer
        open={showPreview}
        onOpenChange={setShowPreview}
        fileId={previewFile.id}
        equipmentId={equipment_id}
        fileName={previewFile.file_name}
        mimeType={previewFile.mime_type}
      />
    )}
    </>
  );
}
