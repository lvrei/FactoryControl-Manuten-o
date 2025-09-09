import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle, X, Clock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { iotService, type Alert as IoTAlert } from "@/services/iotService";
import { authService } from "@/services/authService";

function priorityScore(p: string | undefined) {
  switch ((p || "medium").toLowerCase()) {
    case "critical": return 4;
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 1;
  }
}

function formatSince(iso?: string) {
  if (!iso) return "agora";
  const d = new Date(iso);
  const diffMin = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (diffMin < 60) return `${diffMin} min atrás`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return `${h}h ${m}min atrás`;
}

export function IoTAlertPopup({ alert, onClose, onAck }: { alert: IoTAlert; onClose: () => void; onAck: (id: string) => void; }) {
  const [visible, setVisible] = useState(true);
  const Icon = alert.priority === "critical" ? AlertTriangle : Bell;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className={cn("bg-white rounded-lg border shadow-xl w-full max-w-md animate-in slide-in-from-top-2 duration-200")}>        
        <div className="p-4 border-b flex items-center gap-2">
          <Icon className={cn("h-5 w-5", alert.priority === "critical" ? "text-red-600" : "text-orange-500")} />
          <h3 className="font-semibold text-lg">Alerta de Sensor</h3>
        </div>
        <div className="p-4 space-y-2">
          <div className="text-sm"><span className="font-medium">Máquina:</span> {alert.machine_id}</div>
          <div className="text-sm"><span className="font-medium">Métrica:</span> {alert.metric} = {alert.value}</div>
          <div className="text-sm"><span className="font-medium">Prioridade:</span> {alert.priority}</div>
          {alert.message ? (<div className="text-sm"><span className="font-medium">Mensagem:</span> {alert.message}</div>) : null}
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {formatSince(alert.created_at)}</div>
        </div>
        <div className="p-4 border-t flex gap-2 justify-end">
          <button onClick={() => { setVisible(false); setTimeout(onClose, 150); }} className="px-3 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 flex items-center gap-2">
            <X className="h-4 w-4" /> Fechar
          </button>
          <button onClick={() => { setVisible(false); setTimeout(() => onAck(alert.id), 150); }} className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export function IoTAlertPopupContainer() {
  const [alerts, setAlerts] = useState<IoTAlert[]>([]);
  const [current, setCurrent] = useState<IoTAlert | null>(null);

  const canNotify = useMemo(() => authService.hasAnyRole(["maintenance", "admin"]) || authService.hasRole("maintenance"), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await iotService.listAlerts("active");
        if (!cancelled) setAlerts(list || []);
      } catch {}
    };
    load();
    const t = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!canNotify) return;
    if (alerts.length === 0) { setCurrent(null); return; }
    // pick highest priority alert
    const sorted = [...alerts].sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));
    setCurrent(sorted[0]);
  }, [alerts, canNotify]);

  const handleAck = async (id: string) => {
    try { await iotService.ackAlert(id); } catch {}
    setCurrent(null);
    // refresh list
    try { const list = await iotService.listAlerts("active"); setAlerts(list || []); } catch {}
  };

  if (!canNotify || !current) return null;
  return <IoTAlertPopup alert={current} onClose={() => setCurrent(null)} onAck={handleAck} />;
}
