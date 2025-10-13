import { useEffect, useRef, useState } from "react";
import { camerasService, ROI } from "@/services/camerasService";
import { visionService } from "@/services/visionService";
import { Activity, AlertCircle, CheckCircle, Video } from "lucide-react";

interface LiveCameraViewProps {
  cameraId: string;
  rois: ROI[];
  showDetections?: boolean;
}

const ROI_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
];

interface Detection {
  roiId?: string;
  status: "active" | "inactive";
  confidence: number;
  timestamp: Date;
  message?: string;
}

export function LiveCameraView({
  cameraId,
  rois,
  showDetections = true,
}: LiveCameraViewProps) {
  const videoRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [streamError, setStreamError] = useState(false);
  const [streamLoaded, setStreamLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);

  // Load MJPEG stream with fallback to snapshot polling
  useEffect(() => {
    if (!cameraId || !videoRef.current) return;

    const img = videoRef.current;

    // Reset states
    setStreamError(false);
    setStreamLoaded(false);
    setUseFallback(false);

    // Try MJPEG first
    const mjpegUrl = camerasService.getMjpegUrl(cameraId);
    img.src = mjpegUrl;

    // For MJPEG streams, onload doesn't fire reliably because it's a continuous multipart stream
    // We'll check if the image has dimensions after a delay
    const loadTimer = setTimeout(() => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        // Image has loaded successfully
        setStreamLoaded(true);
      } else {
        // MJPEG didn't work, fallback to snapshot polling
        console.log('MJPEG stream failed, using snapshot fallback');
        setUseFallback(true);
        setStreamLoaded(true);
      }
    }, 3000);

    img.onerror = (e) => {
      console.error('MJPEG error:', e, 'URL:', mjpegUrl);
      setUseFallback(true);
      setStreamLoaded(true);
      clearTimeout(loadTimer);
    };

    return () => {
      clearTimeout(loadTimer);
      img.src = "";
      img.onerror = null;
    };
  }, [cameraId]);

  // Fallback: Poll snapshots if MJPEG fails
  useEffect(() => {
    if (!useFallback || !cameraId || !videoRef.current) return;

    const img = videoRef.current;
    let attemptCount = 0;

    const updateSnapshot = async () => {
      const snapshotUrl = camerasService.getSnapshotUrl(cameraId);
      attemptCount++;

      // Use fetch to get better error information
      try {
        const response = await fetch(snapshotUrl);
        if (!response.ok) {
          console.error(`Snapshot HTTP error: ${response.status} ${response.statusText}`, snapshotUrl);
          const text = await response.text();
          console.error('Response body:', text);
          return;
        }

        // Convert to blob and create object URL
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        img.src = objectUrl;

        // Clean up old object URL after image loads
        img.onload = () => {
          if (attemptCount === 1) {
            console.log('Snapshot loaded successfully on first attempt');
          }
          URL.revokeObjectURL(objectUrl);
        };
      } catch (error) {
        console.error('Snapshot fetch error:', error, snapshotUrl);
      }
    };

    updateSnapshot();
    const interval = setInterval(updateSnapshot, 1000); // Update every second

    return () => {
      clearInterval(interval);
      img.onerror = null;
      img.onload = null;
    };
  }, [useFallback, cameraId]);

  // Poll for detection events
  useEffect(() => {
    if (!cameraId || !showDetections) return;

    const pollEvents = async () => {
      try {
        // Get latest status for this camera
        const status = await visionService.getStatusByCamera(cameraId);

        const detection: Detection = {
          status: status.status,
          confidence: status.confidence || 0,
          timestamp: new Date(),
        };

        setDetections((prev) => {
          const updated = [detection, ...prev.slice(0, 4)]; // Keep last 5
          return updated;
        });

        setLastEventTime(new Date());
      } catch (error) {
        // Silently handle - camera might not have events yet
      }
    };

    pollEvents();
    const interval = setInterval(pollEvents, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [cameraId, showDetections]);

  // Draw ROIs and detections on canvas
  useEffect(() => {
    const drawOverlay = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (!canvas || !video || !streamLoaded) {
        animationFrameRef.current = requestAnimationFrame(drawOverlay);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size to match video
      if (canvas.width !== video.width || canvas.height !== video.height) {
        canvas.width = video.width;
        canvas.height = video.height;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw ROIs
      rois.forEach((roi, index) => {
        const color = ROI_COLORS[index % ROI_COLORS.length];
        const x = (roi.coordinates.x / 100) * canvas.width;
        const y = (roi.coordinates.y / 100) * canvas.height;
        const width = (roi.coordinates.width / 100) * canvas.width;
        const height = (roi.coordinates.height / 100) * canvas.height;

        // Determine if this ROI has active detection
        const hasActiveDetection =
          detections.length > 0 && detections[0].status === "active";

        // Fill with semi-transparent color (brighter if active)
        ctx.fillStyle = hasActiveDetection ? color + "50" : color + "30";
        ctx.fillRect(x, y, width, height);

        // Draw border (thicker and brighter if active)
        ctx.strokeStyle = hasActiveDetection ? "#00FF00" : color;
        ctx.lineWidth = hasActiveDetection ? 4 : 2;
        ctx.strokeRect(x, y, width, height);

        // Draw label background
        const labelHeight = 28;
        ctx.fillStyle = hasActiveDetection ? "#00FF00" : color;
        ctx.fillRect(x, y - labelHeight, width, labelHeight);

        // Draw ROI name
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(roi.name, x + 8, y - 8);

        // Draw detection status icon if active
        if (hasActiveDetection && detections[0].confidence) {
          const confidence = Math.round(detections[0].confidence * 100);
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 11px sans-serif";
          ctx.fillText(`✓ ${confidence}%`, x + width - 55, y - 8);
        }

        // Draw analysis type icon
        const icon = getAnalysisTypeIcon(roi.analysisType);
        ctx.font = "16px sans-serif";
        ctx.fillText(icon, x + width - 25, y - 6);
      });

      // Draw detection pulse effect
      if (detections.length > 0 && detections[0].status === "active") {
        const elapsed = Date.now() - detections[0].timestamp.getTime();
        if (elapsed < 1000) {
          const alpha = 1 - elapsed / 1000;
          ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
          ctx.lineWidth = 6;
          ctx.strokeRect(0, 0, canvas.width, canvas.height);
        }
      }

      animationFrameRef.current = requestAnimationFrame(drawOverlay);
    };

    animationFrameRef.current = requestAnimationFrame(drawOverlay);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [rois, detections, streamLoaded]);

  const getAnalysisTypeIcon = (type: ROI["analysisType"]) => {
    switch (type) {
      case "people_count":
        return "👥";
      case "motion_detection":
        return "🔄";
      case "zone_occupancy":
        return "📍";
      default:
        return "⚙️";
    }
  };

  const getStatusColor = (status: "active" | "inactive") => {
    return status === "active"
      ? "text-green-600 bg-green-100"
      : "text-gray-600 bg-gray-100";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Visualização em Tempo Real</h3>
          {streamLoaded && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
              <Activity className="h-3 w-3" />
              LIVE
            </span>
          )}
        </div>
        {showDetections && lastEventTime && (
          <span className="text-xs text-muted-foreground">
            Última detecção:{" "}
            {lastEventTime.toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* Live Camera Feed Container */}
      <div
        className="relative rounded-xl border-2 border-border/40 overflow-hidden bg-black"
        style={{ aspectRatio: "16/9" }}
      >
        {streamError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90">
            <div className="text-center text-white p-6">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-500" />
              <h4 className="font-bold mb-2">Erro ao carregar stream</h4>
              <p className="text-sm text-gray-400">
                Verifique se a câmara está acessível e configurada corretamente
              </p>
            </div>
          </div>
        ) : !streamLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-3"></div>
              <p className="text-sm">Carregando stream...</p>
            </div>
          </div>
        ) : null}

        {/* MJPEG Video Stream */}
        <img
          ref={videoRef}
          alt="Live camera feed"
          className="absolute inset-0 w-full h-full object-contain"
        />

        {/* Canvas Overlay for ROIs and Detections */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ imageRendering: "crisp-edges" }}
        />

        {/* Stream Type & ROI Count Badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {streamLoaded && (
            <div className="px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-lg text-white text-xs font-semibold">
              {useFallback ? "📸 Snapshot (1fps)" : "🎥 MJPEG Stream"}
            </div>
          )}
          {rois.length > 0 && (
            <div className="px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-lg text-white text-sm font-semibold">
              {rois.length} {rois.length === 1 ? "ROI" : "ROIs"} configurada
              {rois.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Detection Events Log */}
      {showDetections && detections.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-gradient-to-br from-muted/20 to-transparent p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Eventos de Detecção Recentes
          </h4>
          <div className="space-y-2">
            {detections.map((detection, index) => (
              <div
                key={index}
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${getStatusColor(detection.status)}`}
              >
                <div className="flex items-center gap-2">
                  {detection.status === "active" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="font-semibold capitalize">
                    {detection.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                  {detection.confidence > 0 && (
                    <span className="text-xs">
                      ({Math.round(detection.confidence * 100)}% confiança)
                    </span>
                  )}
                </div>
                <span className="text-xs">
                  {detection.timestamp.toLocaleTimeString("pt-PT", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Detection Buttons */}
      <div className="flex gap-2 items-center justify-end">
        <button
          onClick={async () => {
            try {
              // Simulate active detection
              await visionService.postMockEvent({
                machineId: "test",
                cameraId: cameraId,
                status: "active",
                confidence: 0.95,
              });
              // Refresh detections
              const status = await visionService.getStatusByCamera(cameraId);
              setDetections([
                {
                  status: status.status,
                  confidence: status.confidence || 0,
                  timestamp: new Date(),
                },
                ...detections.slice(0, 4),
              ]);
              setLastEventTime(new Date());
            } catch (error) {
              console.error("Failed to simulate detection:", error);
            }
          }}
          className="px-3 py-1.5 text-xs border-2 border-input rounded-lg hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 hover:text-white hover:border-green-600 transition-all font-semibold"
        >
          🧪 Simular Detecção ATIVA
        </button>
        <button
          onClick={async () => {
            try {
              // Simulate inactive detection
              await visionService.postMockEvent({
                machineId: "test",
                cameraId: cameraId,
                status: "inactive",
                confidence: 0.85,
              });
              // Refresh detections
              const status = await visionService.getStatusByCamera(cameraId);
              setDetections([
                {
                  status: status.status,
                  confidence: status.confidence || 0,
                  timestamp: new Date(),
                },
                ...detections.slice(0, 4),
              ]);
              setLastEventTime(new Date());
            } catch (error) {
              console.error("Failed to simulate detection:", error);
            }
          }}
          className="px-3 py-1.5 text-xs border-2 border-input rounded-lg hover:bg-gradient-to-r hover:from-gray-500 hover:to-gray-600 hover:text-white hover:border-gray-600 transition-all font-semibold"
        >
          🧪 Simular Detecção INATIVA
        </button>
      </div>

      {/* Instructions */}
      <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <h4 className="font-semibold mb-2 text-blue-700 dark:text-blue-400">
          💡 Como usar:
        </h4>
        <ul className="space-y-1 ml-4 list-disc text-blue-600 dark:text-blue-300">
          <li>
            As zonas de interesse (ROIs) são desenhadas sobre o stream em tempo
            real
          </li>
          <li>Retângulos verdes indicam detecções ativas na zona</li>
          <li>A percentagem mostra a confiança da detecção</li>
          <li>Eventos recentes aparecem abaixo com timestamp</li>
          <li>
            Use os botões de teste acima para simular detecções e verificar se
            tudo funciona corretamente
          </li>
        </ul>
      </div>
    </div>
  );
}
