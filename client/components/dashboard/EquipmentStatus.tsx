import { Activity, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Equipment {
  id: string;
  name: string;
  status: "running" | "maintenance" | "stopped" | "warning";
  efficiency: number;
  lastUpdate: string;
}

const equipmentData: Equipment[] = [
  { id: "1", name: "Linha de Montagem A", status: "running", efficiency: 94, lastUpdate: "2 min" },
  { id: "2", name: "Prensa Hidráulica 01", status: "running", efficiency: 87, lastUpdate: "1 min" },
  { id: "3", name: "Esteira Transportadora", status: "warning", efficiency: 72, lastUpdate: "5 min" },
  { id: "4", name: "Forno Industrial", status: "maintenance", efficiency: 0, lastUpdate: "30 min" },
  { id: "5", name: "Robô Soldador", status: "running", efficiency: 98, lastUpdate: "1 min" },
  { id: "6", name: "Sistema de Pintura", status: "stopped", efficiency: 0, lastUpdate: "45 min" },
];

const statusConfig = {
  running: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    label: "Operando"
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
    label: "Atenção"
  },
  maintenance: {
    icon: Clock,
    color: "text-info",
    bg: "bg-info/10",
    label: "Manutenção"
  },
  stopped: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Parado"
  }
};

export function EquipmentStatus() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Status dos Equipamentos</h3>
          <p className="text-sm text-muted-foreground">Monitoramento em tempo real</p>
        </div>
        <Activity className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-4">
        {equipmentData.map((equipment) => {
          const config = statusConfig[equipment.status];
          const StatusIcon = config.icon;

          return (
            <div
              key={equipment.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <div className={cn("rounded-full p-2", config.bg)}>
                  <StatusIcon className={cn("h-4 w-4", config.color)} />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">{equipment.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {config.label} • Última atualização: {equipment.lastUpdate}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium text-card-foreground">
                  {equipment.efficiency}%
                </p>
                <p className="text-xs text-muted-foreground">Eficiência</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
