import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { ROI } from "@/services/camerasService";

interface ROIEditorProps {
  cameraId?: string;
  snapshotUrl?: string;
  rois: ROI[];
  onChange: (rois: ROI[]) => void;
}

const ANALYSIS_TYPES = [
  { value: "people_count", label: "Contagem de Pessoas", icon: "👥" },
  { value: "motion_detection", label: "Detecção de Movimento", icon: "🔄" },
  { value: "zone_occupancy", label: "Ocupação de Zona", icon: "📍" },
  { value: "custom", label: "Personalizado", icon: "⚙️" },
] as const;

const ROI_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
];

export function ROIEditor({
  cameraId,
  snapshotUrl,
  rois,
  onChange,
}: ROIEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [currentRect, setCurrentRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [selectedRoi, setSelectedRoi] = useState<string | null>(null);
  const [editingRoi, setEditingRoi] = useState<ROI | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    analysisType: "motion_detection" as ROI["analysisType"],
  });

  // Load snapshot image
  useEffect(() => {
    if (snapshotUrl && imageRef.current) {
      const img = imageRef.current;
      img.src = snapshotUrl;
      img.onload = () => {
        setImageLoaded(true);
        redrawCanvas();
      };
    }
  }, [snapshotUrl]);

  // Redraw canvas when ROIs change
  useEffect(() => {
    if (imageLoaded) {
      redrawCanvas();
    }
  }, [rois, selectedRoi, currentRect, imageLoaded]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = image.width;
    canvas.height = image.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing ROIs
    rois.forEach((roi, index) => {
      const color = ROI_COLORS[index % ROI_COLORS.length];
      const x = (roi.coordinates.x / 100) * canvas.width;
      const y = (roi.coordinates.y / 100) * canvas.height;
      const width = (roi.coordinates.width / 100) * canvas.width;
      const height = (roi.coordinates.height / 100) * canvas.height;

      // Fill with semi-transparent color
      ctx.fillStyle = color + "40";
      ctx.fillRect(x, y, width, height);

      // Draw border
      ctx.strokeStyle = selectedRoi === roi.id ? "#FFFFFF" : color;
      ctx.lineWidth = selectedRoi === roi.id ? 3 : 2;
      ctx.strokeRect(x, y, width, height);

      // Draw label
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 24, width, 24);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(roi.name, x + 5, y - 8);
    });

    // Draw current drawing rectangle
    if (currentRect) {
      ctx.fillStyle = "#3B82F620";
      ctx.fillRect(
        currentRect.x,
        currentRect.y,
        currentRect.width,
        currentRect.height,
      );
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        currentRect.x,
        currentRect.y,
        currentRect.width,
        currentRect.height,
      );
      ctx.setLineDash([]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (showForm) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on existing ROI
    const clickedRoi = rois.find((roi) => {
      const roiX = (roi.coordinates.x / 100) * canvas.width;
      const roiY = (roi.coordinates.y / 100) * canvas.height;
      const roiWidth = (roi.coordinates.width / 100) * canvas.width;
      const roiHeight = (roi.coordinates.height / 100) * canvas.height;

      return (
        x >= roiX && x <= roiX + roiWidth && y >= roiY && y <= roiY + roiHeight
      );
    });

    if (clickedRoi) {
      setSelectedRoi(clickedRoi.id);
      return;
    }

    // Start drawing new ROI
    setIsDrawing(true);
    setDrawStart({ x, y });
    setSelectedRoi(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = x - drawStart.x;
    const height = y - drawStart.y;

    setCurrentRect({
      x: width < 0 ? x : drawStart.x,
      y: height < 0 ? y : drawStart.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });

    redrawCanvas();
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect || !canvasRef.current) {
      setIsDrawing(false);
      return;
    }

    const canvas = canvasRef.current;

    // Convert to percentages
    const coordinates = {
      x: (currentRect.x / canvas.width) * 100,
      y: (currentRect.y / canvas.height) * 100,
      width: (currentRect.width / canvas.width) * 100,
      height: (currentRect.height / canvas.height) * 100,
    };

    // Only create ROI if it has some size
    if (coordinates.width > 1 && coordinates.height > 1) {
      setEditingRoi({
        id: `roi_${Date.now()}`,
        name: "",
        description: "",
        analysisType: "motion_detection",
        coordinates,
        enabled: true,
      });
      setShowForm(true);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentRect(null);
  };

  const handleSaveROI = () => {
    if (!editingRoi) return;

    if (!form.name.trim()) {
      alert("Por favor, insira um nome para a zona");
      return;
    }

    const newRoi: ROI = {
      ...editingRoi,
      name: form.name,
      description: form.description,
      analysisType: form.analysisType,
    };

    if (rois.find((r) => r.id === newRoi.id)) {
      onChange(rois.map((r) => (r.id === newRoi.id ? newRoi : r)));
    } else {
      onChange([...rois, newRoi]);
    }

    resetForm();
  };

  const handleEditROI = (roi: ROI) => {
    setEditingRoi(roi);
    setForm({
      name: roi.name,
      description: roi.description,
      analysisType: roi.analysisType,
    });
    setShowForm(true);
    setSelectedRoi(roi.id);
  };

  const handleDeleteROI = (id: string) => {
    if (!confirm("Remover esta zona de interesse?")) return;
    onChange(rois.filter((r) => r.id !== id));
    if (selectedRoi === id) setSelectedRoi(null);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingRoi(null);
    setForm({
      name: "",
      description: "",
      analysisType: "motion_detection",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Zonas de Interesse (ROI)</h3>
          <p className="text-sm text-muted-foreground">
            Desenhe retângulos na imagem para definir as zonas a analisar
          </p>
        </div>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="relative rounded-xl border-2 border-border/40 overflow-hidden bg-black/5"
        style={{ maxWidth: "100%", aspectRatio: "16/9" }}
      >
        {snapshotUrl ? (
          <>
            <img
              ref={imageRef}
              src={snapshotUrl}
              alt="Camera preview"
              className="absolute inset-0 w-full h-full object-contain"
              crossOrigin="anonymous"
            />
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="absolute inset-0 w-full h-full cursor-crosshair"
              style={{ imageRendering: "crisp-edges" }}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="mb-2">Aguardando snapshot da câmara...</p>
              <p className="text-sm">Configure a URL da câmara primeiro</p>
            </div>
          </div>
        )}
      </div>

      {/* ROI List */}
      {rois.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">
            Zonas Configuradas ({rois.length})
          </h4>
          <div className="grid gap-2">
            {rois.map((roi, index) => {
              const typeInfo = ANALYSIS_TYPES.find(
                (t) => t.value === roi.analysisType,
              );
              const color = ROI_COLORS[index % ROI_COLORS.length];

              return (
                <div
                  key={roi.id}
                  onClick={() => setSelectedRoi(roi.id)}
                  className={`group rounded-xl border-2 p-3 transition-all duration-300 cursor-pointer ${
                    selectedRoi === roi.id
                      ? "border-primary bg-primary/5 shadow-lg"
                      : "border-border/40 hover:border-primary/30 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className="w-4 h-4 rounded mt-1 flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{roi.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                            {typeInfo?.icon} {typeInfo?.label}
                          </span>
                        </div>
                        {roi.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {roi.description}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          Posição: {roi.coordinates.x.toFixed(1)}%,{" "}
                          {roi.coordinates.y.toFixed(1)}% • Tamanho:{" "}
                          {roi.coordinates.width.toFixed(1)}% ×{" "}
                          {roi.coordinates.height.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditROI(roi);
                        }}
                        className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteROI(roi.id);
                        }}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && editingRoi && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-2xl max-w-lg w-full shadow-2xl border border-border/40">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">
                  Configurar Zona de Interesse
                </h3>
                <button
                  onClick={resetForm}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Nome da Zona *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-input rounded-xl bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Ex: Zona de Trabalho Principal"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Tipo de Análise *
                  </label>
                  <select
                    value={form.analysisType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        analysisType: e.target.value as ROI["analysisType"],
                      })
                    }
                    className="w-full px-4 py-2.5 border-2 border-input rounded-xl bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                  >
                    {ANALYSIS_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Descrição do Objetivo
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-input rounded-xl bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                    placeholder="Ex: Contar quantas pessoas estão nesta zona e calcular tempo total de ocupação ao fim do dia"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Esta descrição será usada nos relatórios de performance
                  </p>
                </div>

                <div className="bg-muted/30 rounded-xl p-3">
                  <h4 className="text-sm font-semibold mb-2">
                    Coordenadas da Zona
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">X:</span>{" "}
                      <span className="font-mono">
                        {editingRoi.coordinates.x.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Y:</span>{" "}
                      <span className="font-mono">
                        {editingRoi.coordinates.y.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Largura:</span>{" "}
                      <span className="font-mono">
                        {editingRoi.coordinates.width.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Altura:</span>{" "}
                      <span className="font-mono">
                        {editingRoi.coordinates.height.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 border-2 border-input rounded-xl hover:bg-muted transition-all font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveROI}
                    className="px-4 py-2.5 bg-gradient-to-r from-primary via-blue-600 to-primary text-primary-foreground rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Guardar Zona
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
