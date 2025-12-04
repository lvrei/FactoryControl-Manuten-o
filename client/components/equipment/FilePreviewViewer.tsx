import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { apiFetch } from "@/config/api";

interface FilePreviewViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  entityId: string;
  fileName: string;
  mimeType: string;
  entityType?: "equipment" | "material"; // Default: equipment
}

export function FilePreviewViewer({
  open,
  onOpenChange,
  fileId,
  entityId,
  fileName,
  mimeType,
  entityType = "equipment",
}: FilePreviewViewerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (open) {
      loadFilePreview();
    }
  }, [open, fileId]);

  const loadFilePreview = async () => {
    try {
      setLoading(true);
      setError(null);
      setFileContent(null);
      setFileBlob(null);

      const response = await apiFetch(
        `equipment/${equipmentId}/files/${fileId}/download`
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar ficheiro");
      }

      const blob = await response.blob();
      setFileBlob(blob);

      // For images, create a data URL
      if (mimeType.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFileContent(e.target?.result as string);
        };
        reader.readAsDataURL(blob);
      } else if (mimeType === "application/pdf") {
        // For PDFs, create a blob URL
        const url = URL.createObjectURL(blob);
        setFileContent(url);
      } else {
        // For other types (Word, etc), show a message
        setError("Este tipo de ficheiro não pode ser pré-visualizado diretamente");
      }
    } catch (err) {
      console.error("Erro ao carregar pré-visualização:", err);
      setError("Erro ao carregar pré-visualização do ficheiro");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!fileBlob) return;

    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Pré-visualização de Ficheiro</DialogTitle>
          <DialogDescription>{fileName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="mb-4">A carregar...</div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              <p className="font-medium">Erro</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {mimeType.startsWith("image/") && fileContent && (
            <div className="flex justify-center">
              <img
                src={fileContent}
                alt={fileName}
                className="max-w-full max-h-[60vh] rounded-lg"
              />
            </div>
          )}

          {mimeType === "application/pdf" && fileContent && (
            <iframe
              src={fileContent}
              className="w-full h-[60vh] rounded-lg border"
              title="PDF Viewer"
            />
          )}

          {!mimeType.startsWith("image/") &&
            mimeType !== "application/pdf" &&
            fileBlob &&
            !loading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
                <p className="font-medium mb-2">Tipo de ficheiro não suportado</p>
                <p className="text-sm mb-4">
                  Este tipo de ficheiro não pode ser pré-visualizado no navegador.
                </p>
                <Button
                  onClick={handleDownload}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Fazer Download
                </Button>
              </div>
            )}

          <div className="flex justify-end gap-2">
            {fileBlob && (
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
