import { ROI } from "@/services/camerasService";
import { visionService } from "@/services/visionService";

const ROI_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
];

interface ROIDetectionTestProps {
  rois: ROI[];
  cameraId: string;
  onDetectionUpdate: (roiId: string, status: "active" | "inactive", confidence: number) => void;
}

export function ROIDetectionTest({ rois, cameraId, onDetectionUpdate }: ROIDetectionTestProps) {
  if (rois.length === 0) return null;

  const handleTest = async (roi: ROI, status: "active" | "inactive") => {
    try {
      const confidence = status === "active" ? 0.95 : 0;
      
      await visionService.postMockEvent({
        machineId: "test",
        cameraId: cameraId,
        roiId: roi.id,
        status,
        confidence,
      });

      // Get updated status
      const updatedStatus = await visionService.getStatusByROI(roi.id);
      onDetectionUpdate(roi.id, updatedStatus.status, updatedStatus.confidence || 0);
    } catch (error) {
      console.error("Failed to simulate detection:", error);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-semibold">
        🧪 Testar Detecção por ROI:
      </p>
      <div className="flex flex-wrap gap-2">
        {rois.map((roi, index) => (
          <div key={roi.id} className="flex gap-1">
            <button
              onClick={() => handleTest(roi, "active")}
              className="px-2 py-1 text-[10px] border border-input rounded hover:bg-green-500 hover:text-white transition-all font-semibold"
              style={{ borderColor: ROI_COLORS[index % ROI_COLORS.length] }}
            >
              ✓ {roi.name}
            </button>
            <button
              onClick={() => handleTest(roi, "inactive")}
              className="px-2 py-1 text-[10px] border border-input rounded hover:bg-gray-500 hover:text-white transition-all font-semibold"
              style={{ borderColor: ROI_COLORS[index % ROI_COLORS.length] }}
            >
              ✗
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
