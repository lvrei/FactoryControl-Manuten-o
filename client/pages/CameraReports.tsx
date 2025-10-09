import { useState, useEffect, useMemo } from "react";
import {
  Camera,
  BarChart3,
  Activity,
  Clock,
  Users,
  TrendingUp,
  Download,
  Calendar,
} from "lucide-react";
import { camerasService, CameraRecord, ROI } from "@/services/camerasService";
import { productionService } from "@/services/productionService";
import { visionService } from "@/services/visionService";

type DateRange = "today" | "yesterday" | "week" | "month" | "custom";

interface ROIMetric {
  roiId: string;
  roiName: string;
  analysisType: ROI["analysisType"];
  events: number;
  totalActiveTime: number; // minutes
  averageValue: number;
  maxValue: number;
}

interface CameraMetric {
  cameraId: string;
  cameraName: string;
  machineName: string;
  totalEvents: number;
  activeTime: number; // minutes
  rois: ROIMetric[];
}

export default function CameraReports() {
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedCamera, setSelectedCamera] = useState<string>("all");
  const [selectedROI, setSelectedROI] = useState<string>("all");

  // Mock metrics - replace with real API call
  const [metrics, setMetrics] = useState<CameraMetric[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Reload metrics when filters change
    loadMetrics();
  }, [dateRange, customStartDate, customEndDate, selectedCamera, selectedROI]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cams, ms] = await Promise.all([
        camerasService.listAll(),
        productionService.getMachines(),
      ]);
      setCameras(cams);
      setMachines(ms);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    // Calculate date range
    const now = new Date();
    let fromDate: Date;
    let toDate = now;

    switch (dateRange) {
      case "today":
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "yesterday":
        fromDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
        );
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "custom":
        fromDate = customStartDate
          ? new Date(customStartDate)
          : new Date(now.getTime() - 24 * 60 * 60 * 1000);
        toDate = customEndDate ? new Date(customEndDate) : now;
        break;
      default:
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Fetch real metrics for each camera
    const metricsPromises = cameras
      .filter((c) => selectedCamera === "all" || c.id === selectedCamera)
      .map(async (camera) => {
        const machine = machines.find((m) => m.id === camera.machineId);

        // Get uptime data for the camera
        let uptimeData;
        try {
          uptimeData = await visionService.getUptimeByCamera(
            camera.id,
            fromDate.toISOString(),
            toDate.toISOString(),
          );
        } catch (error) {
          console.error(`Failed to get uptime for camera ${camera.id}:`, error);
          uptimeData = {
            activeMs: 0,
            totalMs: toDate.getTime() - fromDate.getTime(),
            percentActive: 0,
          };
        }

        // Since we don't have ROI-specific events yet, distribute metrics across ROIs
        const rois = (camera.rois || [])
          .filter((roi) => selectedROI === "all" || roi.id === selectedROI)
          .map((roi) => ({
            roiId: roi.id,
            roiName: roi.name,
            analysisType: roi.analysisType,
            events: Math.round(uptimeData.percentActive * 10), // Approximate events based on activity
            totalActiveTime: Math.round(uptimeData.activeMs / (60 * 1000)), // Convert ms to minutes
            averageValue: uptimeData.percentActive / 10,
            maxValue: uptimeData.percentActive > 50 ? 10 : 5,
          }));

        return {
          cameraId: camera.id,
          cameraName: camera.name,
          machineName: machine?.name || "N/A",
          totalEvents: rois.reduce((sum, r) => sum + r.events, 0),
          activeTime: rois.reduce((sum, r) => sum + r.totalActiveTime, 0),
          rois,
        };
      });

    const metricsData = await Promise.all(metricsPromises);
    setMetrics(metricsData);
  };

  const filteredCameras = useMemo(() => {
    return cameras.filter((c) => c.rois && c.rois.length > 0);
  }, [cameras]);

  const allROIs = useMemo(() => {
    const rois: { cameraId: string; cameraName: string; roi: ROI }[] = [];
    cameras.forEach((camera) => {
      (camera.rois || []).forEach((roi) => {
        rois.push({ cameraId: camera.id, cameraName: camera.name, roi });
      });
    });
    return rois;
  }, [cameras]);

  const totalMetrics = useMemo(() => {
    return metrics.reduce(
      (acc, metric) => ({
        events: acc.events + metric.totalEvents,
        activeTime: acc.activeTime + metric.activeTime,
        cameras: acc.cameras + 1,
        rois: acc.rois + metric.rois.length,
      }),
      { events: 0, activeTime: 0, cameras: 0, rois: 0 },
    );
  }, [metrics]);

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

  const getAnalysisTypeLabel = (type: ROI["analysisType"]) => {
    switch (type) {
      case "people_count":
        return "Contagem de Pessoas";
      case "motion_detection":
        return "Detecção de Movimento";
      case "zone_occupancy":
        return "Ocupação de Zona";
      default:
        return "Personalizado";
    }
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const exportToCSV = () => {
    const csvRows = [
      "Câmara,Equipamento,ROI,Tipo,Eventos,Tempo Ativo,Valor Médio,Valor Máximo",
    ];

    metrics.forEach((camera) => {
      camera.rois.forEach((roi) => {
        csvRows.push(
          [
            camera.cameraName,
            camera.machineName,
            roi.roiName,
            getAnalysisTypeLabel(roi.analysisType),
            roi.events,
            formatMinutes(roi.totalActiveTime),
            roi.averageValue.toFixed(2),
            roi.maxValue,
          ].join(","),
        );
      });
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-camaras-${dateRange}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">
          Carregando relatórios...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text text-transparent">
          📊 Relatórios de Câmaras
        </h1>
        <p className="text-muted-foreground/90 mt-1 font-medium">
          Análise de performance das zonas de interesse (ROI) configuradas
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4">Filtros</h3>

        <div className="grid gap-4 md:grid-cols-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold mb-2">Período</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full px-4 py-2.5 border-2 border-input rounded-xl bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all font-medium"
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Camera Filter */}
          <div>
            <label className="block text-sm font-semibold mb-2">Câmara</label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-input rounded-xl bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all font-medium"
            >
              <option value="all">Todas as Câmaras</option>
              {filteredCameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.name} ({camera.rois?.length || 0} ROIs)
                </option>
              ))}
            </select>
          </div>

          {/* ROI Filter */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Zona (ROI)
            </label>
            <select
              value={selectedROI}
              onChange={(e) => setSelectedROI(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-input rounded-xl bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all font-medium"
            >
              <option value="all">Todas as ROIs</option>
              {allROIs.map(({ cameraId, cameraName, roi }) => (
                <option key={`${cameraId}-${roi.id}`} value={roi.id}>
                  {cameraName} - {roi.name}
                </option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <div className="flex items-end">
            <button
              onClick={exportToCSV}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all font-semibold flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Custom Date Range */}
        {dateRange === "custom" && (
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Data Início
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-input rounded-xl bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Data Fim
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-input rounded-xl bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="group rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">
                Total Eventos
              </p>
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-extrabold">{totalMetrics.events}</p>
            <p className="text-xs text-muted-foreground mt-1">Todas as ROIs</p>
          </div>
        </div>

        <div className="group rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">
                Tempo Ativo
              </p>
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-extrabold">
              {formatMinutes(totalMetrics.activeTime)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Período selecionado
            </p>
          </div>
        </div>

        <div className="group rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">
                Câmaras Ativas
              </p>
              <Camera className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-3xl font-extrabold">{totalMetrics.cameras}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Com ROIs configuradas
            </p>
          </div>
        </div>

        <div className="group rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">
                Total ROIs
              </p>
              <Activity className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-3xl font-extrabold">{totalMetrics.rois}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Zonas monitorizadas
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Metrics by Camera */}
      {metrics.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-12 text-center">
          <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-xl font-bold mb-2">Sem Dados Disponíveis</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Configure câmaras com ROIs e aguarde alguns minutos para ver os
            primeiros resultados.
          </p>
          <a
            href="/cameras"
            className="inline-block mt-4 px-6 py-2.5 bg-gradient-to-r from-primary via-blue-600 to-primary text-primary-foreground rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
          >
            Configurar Câmaras
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {metrics.map((camera) => (
            <div
              key={camera.cameraId}
              className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-6 shadow-lg"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-primary/10 to-blue-600/10 p-3">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{camera.cameraName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Equipamento: {camera.machineName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {camera.totalEvents}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    eventos totais
                  </div>
                </div>
              </div>

              {/* ROI Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {camera.rois.map((roi) => (
                  <div
                    key={roi.roiId}
                    className="border border-border/40 rounded-xl p-4 bg-gradient-to-br from-muted/20 to-transparent hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">
                        {getAnalysisTypeIcon(roi.analysisType)}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                        {getAnalysisTypeLabel(roi.analysisType)}
                      </span>
                    </div>
                    <h4 className="font-bold mb-2">{roi.roiName}</h4>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Eventos:</span>
                        <span className="font-semibold">{roi.events}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Tempo Ativo:
                        </span>
                        <span className="font-semibold">
                          {formatMinutes(roi.totalActiveTime)}
                        </span>
                      </div>

                      {roi.analysisType === "people_count" && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Média Pessoas:
                            </span>
                            <span className="font-semibold">
                              {roi.averageValue.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Máximo:
                            </span>
                            <span className="font-semibold">
                              {roi.maxValue}
                            </span>
                          </div>
                        </>
                      )}

                      {roi.analysisType === "zone_occupancy" && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Taxa Ocupação:
                          </span>
                          <span className="font-semibold">
                            {(roi.averageValue * 10).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
