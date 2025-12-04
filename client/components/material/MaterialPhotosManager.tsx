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
  Eye,
  Image as ImageIcon,
} from "lucide-react";
import { apiFetch } from "@/config/api";
import { FilePreviewViewer } from "@/components/equipment/FilePreviewViewer";

interface MaterialPhoto {
  id: string;
  material_id: number;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

interface MaterialPhotosManagerProps {
  material_id: number;
  material_name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialPhotosManager({
  material_id,
  material_name,
  open,
  onOpenChange,
}: MaterialPhotosManagerProps) {
  const [photos, setPhotos] = useState<MaterialPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<MaterialPhoto | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadPhotos();
    }
  }, [open]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`materials/${material_id}/photos`);
      if (response.ok) {
        const data = await response.json();
        setPhotos(data);
      }
    } catch (error) {
      console.error("Erro ao carregar fotos:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar fotos",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.currentTarget.files;
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Tipo de ficheiro não permitido",
        description: "São permitidas apenas imagens (JPG, PNG, GIF, WebP)",
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
          `materials/${material_id}/photos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              fileData: base64,
              mimeType: file.type,
            }),
          }
        );

        if (response.ok) {
          toast({
            title: "Foto carregada",
            description: `${file.name} foi carregada com sucesso`,
          });
          loadPhotos();
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Erro ao carregar foto",
          });
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro ao carregar foto:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar foto",
      });
    } finally {
      setUploading(false);
      e.currentTarget.value = "";
    }
  };

  const handleDelete = async (photoId: string, fileName: string) => {
    if (!confirm(`Tem a certeza que deseja eliminar ${fileName}?`)) return;

    try {
      const response = await apiFetch(
        `materials/${material_id}/photos/${photoId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast({
          title: "Foto eliminada",
          description: "Foto removida com sucesso",
        });
        loadPhotos();
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao eliminar foto",
        });
      }
    } catch (error) {
      console.error("Erro ao eliminar foto:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao eliminar foto",
      });
    }
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
          <DialogTitle>Fotos do Material</DialogTitle>
          <DialogDescription>{material_name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Section */}
          <div className="border-2 border-dashed border-border rounded-lg p-6">
            <Label htmlFor="photo-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Clique para carregar foto
                </span>
                <span className="text-xs text-muted-foreground">
                  Imagens (JPG, PNG, GIF, WebP) - máx. 50MB
                </span>
              </div>
              <Input
                id="photo-upload"
                type="file"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
                accept="image/*"
              />
            </Label>
          </div>

          {/* Photos List */}
          <div className="space-y-2">
            <h3 className="font-medium">Fotos ({photos.length})</h3>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                A carregar...
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma foto anexada
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-sm font-medium truncate">
                        {photo.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(photo.file_size)} •{" "}
                        {new Date(photo.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setPreviewPhoto(photo);
                            setShowPreview(true);
                          }}
                          title="Pré-visualizar"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(photo.id, photo.file_name)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
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

    {previewPhoto && (
      <FilePreviewViewer
        open={showPreview}
        onOpenChange={setShowPreview}
        fileId={previewPhoto.id}
        equipmentId={material_id.toString()}
        fileName={previewPhoto.file_name}
        mimeType={previewPhoto.mime_type}
      />
    )}
    </>
  );
}
