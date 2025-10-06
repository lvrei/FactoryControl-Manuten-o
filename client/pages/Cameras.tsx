import { useEffect, useMemo, useState } from "react";
import { camerasService, CameraRecord, ROI } from "@/services/camerasService";
import { productionService } from "@/services/productionService";
import { visionService } from "@/services/visionService";
import { Plus, X, Trash2, Edit, Video, Link as LinkIcon, Camera, BarChart3 } from "lucide-react";
import { ROIEditor } from "@/components/cameras/ROIEditor";

interface MachineOption {
  id: string;
  name: string;
}

type Protocol = "rtsp" | "http" | "webrtc" | "file";

export default function CamerasPage() {
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CameraRecord | null>(null);
  const [search, setSearch] = useState("");

  const [statusByMachine, setStatusByMachine] = useState<
    Record<string, "active" | "inactive">
  >({});

  const [form, setForm] = useState({
    id: "",
    name: "",
    url: "",
    protocol: "rtsp" as Protocol,
    machineId: "" as string | "",
    enabled: true,
    rois: [] as ROI[],
    thresholds: {} as Record<string, any>,
    schedule: {} as Record<string, any>,
  });
  const [thresholdsText, setThresholdsText] = useState("{}");
  const [scheduleText, setScheduleText] = useState("{}");
  const [jsonErrors, setJsonErrors] = useState<{ thresholds?: string; schedule?: string }>({});
  const [snapshotUrl, setSnapshotUrl] = useState<string | undefined>();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [cams, ms] = await Promise.all([
        camerasService.listAll(),
        productionService.getMachines(),
      ]);
      setCameras(cams);
      setMachines(ms.map((m) => ({ id: m.id, name: m.name })));

      // fetch statuses for associated machines
      const uniqueMachineIds = Array.from(
        new Set(cams.map((c) => c.machineId).filter(Boolean) as string[]),
      );
      const entries: [string, "active" | "inactive"][] = [];
      for (const mid of uniqueMachineIds) {
        try {
          const st = await visionService.getStatusByMachine(mid);
          entries.push([mid, st.status]);
        } catch {}
      }
      setStatusByMachine(Object.fromEntries(entries));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      id: "",
      name: "",
      url: "",
      protocol: "rtsp",
      machineId: "",
      enabled: true,
      rois: [],
      thresholds: {},
      schedule: {},
    });
    setEditing(null);
    setThresholdsText("{}");
    setScheduleText("{}");
    setJsonErrors({});
    setSnapshotUrl(undefined);
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return cameras.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.url.toLowerCase().includes(term) ||
        (
          machines
            .find((m) => m.id === (c.machineId || ""))
            ?.name?.toLowerCase() || ""
        ).includes(term),
    );
  }, [search, cameras, machines]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.url) {
      alert("Preencha nome e URL");
      return;
    }
    try {
      // Parse JSON fields from textareas
      let thresholdsParsed: Record<string, any> = {};
      let scheduleParsed: Record<string, any> = {};
      try {
        const t = JSON.parse(thresholdsText || "{}");
        thresholdsParsed = t && typeof t === "object" ? t : {};
      } catch {
        setJsonErrors((p) => ({ ...p, thresholds: "Limiares inválidos (JSON)" }));
        alert("Limiares inválidos (JSON)");
        return;
      }
      try {
        const s = JSON.parse(scheduleText || "{}");
        scheduleParsed = s && typeof s === "object" ? s : {};
      } catch {
        setJsonErrors((p) => ({ ...p, schedule: "Agenda inválida (JSON)" }));
        alert("Agenda inválida (JSON)");
        return;
      }
      setJsonErrors({});
      if (editing) {
        await camerasService.update(editing.id, {
          name: form.name,
          url: form.url,
          protocol: form.protocol,
          machineId: form.machineId || null,
          enabled: form.enabled,
          rois: form.rois,
          thresholds: thresholdsParsed,
          schedule: scheduleParsed,
        });
      } else {
        const created = await camerasService.create({
          id: form.id || undefined,
          name: form.name,
          url: form.url,
          protocol: form.protocol,
          machineId: form.machineId || null,
          enabled: form.enabled,
          rois: form.rois,
          thresholds: thresholdsParsed,
          schedule: scheduleParsed,
        });
        setCameras((prev) => [created, ...prev]);
      }
      await load();
      setShowForm(false);
      resetForm();
    } catch (e) {
      console.error(e);
      alert("Erro ao guardar câmara");
    }
  };

  const onEdit = (c: CameraRecord) => {
    setEditing(c);
    setForm({
      id: c.id,
      name: c.name,
      url: c.url,
      protocol: (c.protocol as Protocol) || "rtsp",
      machineId: c.machineId || "",
      enabled: c.enabled !== false,
      rois: (c.rois || []) as ROI[],
      thresholds: c.thresholds || {},
      schedule: c.schedule || {},
    });
    setThresholdsText(JSON.stringify(c.thresholds || {}, null, 2));
    setScheduleText(JSON.stringify(c.schedule || {}, null, 2));
    setJsonErrors({});

    // Load snapshot for ROI editor
    if (c.id) {
      setSnapshotUrl(camerasService.getSnapshotUrl(c.id));
    }

    setShowForm(true);
  };

  const onDelete = async (id: string) => {
    if (!confirm("Remover esta câmara?")) return;
    try {
      await camerasService.remove(id);
      setCameras((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error(e);
      alert("Erro ao remover");
    }
  };

  if (loading)
    return <div className="p-6 text-muted-foreground">Carregando câmaras…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text text-transparent">
            Câmaras
          </h1>
          <p className="text-muted-foreground/90 mt-1 font-medium">
            Associe câmaras aos equipamentos e configure zonas de interesse para análise.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/camera-reports"
            className="px-4 py-2.5 border-2 border-input rounded-xl hover:bg-gradient-to-r hover:from-accent hover:to-accent/80 hover:border-primary/30 hover:shadow-md flex items-center gap-2 transition-all duration-300 font-semibold hover:scale-[1.02] active:scale-95"
          >
            <BarChart3 className="h-4 w-4" /> Ver Relatórios
          </a>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-primary via-blue-600 to-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] transition-all font-semibold flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Nova Câmara
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome, URL ou equipamento"
          className="flex-1 px-4 py-2.5 border-2 border-input rounded-xl bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all font-medium shadow-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const machineName =
            machines.find((m) => m.id === (c.machineId || ""))?.name || "—";
          return (
            <div key={c.id} className="group rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-4 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="rounded-lg bg-gradient-to-br from-primary/10 to-blue-600/10 p-2">
                      <Video className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-bold">{c.name}</h3>
                    {c.rois && c.rois.length > 0 && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm">
                        {c.rois.length} {c.rois.length === 1 ? 'ROI' : 'ROIs'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <LinkIcon className="h-3 w-3" /> {c.url}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onEdit(c)}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Equipamento</span>
                  <span className="font-semibold">{machineName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Protocolo</span>
                  <span className="font-medium">{c.protocol || "rtsp"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ativa</span>
                  <span className="font-medium">
                    {c.enabled !== false ? "Sim" : "Não"}
                  </span>
                </div>
                {c.machineId && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Status (visão)
                    </span>
                    <span
                      className={`font-medium ${statusByMachine[c.machineId] === "active" ? "text-green-600" : "text-gray-600"}`}
                    >
                      {statusByMachine[c.machineId] || "inactive"}
                    </span>
                  </div>
                )}
                {c.machineId && (
                  <div className="flex items-center gap-2 justify-end pt-1">
                    <button
                      onClick={async () => {
                        await visionService.postMockEvent({
                          machineId: c.machineId!,
                          cameraId: c.id,
                          status: "active",
                          confidence: 0.9,
                        });
                        const st = await visionService.getStatusByMachine(
                          c.machineId!,
                        );
                        setStatusByMachine((prev) => ({
                          ...prev,
                          [c.machineId!]: st.status,
                        }));
                      }}
                      className="px-3 py-1.5 text-xs border-2 border-input rounded-lg hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 hover:text-white hover:border-green-600 transition-all font-semibold"
                    >
                      Set ON
                    </button>
                    <button
                      onClick={async () => {
                        await visionService.postMockEvent({
                          machineId: c.machineId!,
                          cameraId: c.id,
                          status: "inactive",
                          confidence: 0.9,
                        });
                        const st = await visionService.getStatusByMachine(
                          c.machineId!,
                        );
                        setStatusByMachine((prev) => ({
                          ...prev,
                          [c.machineId!]: st.status,
                        }));
                      }}
                      className="px-3 py-1.5 text-xs border-2 border-input rounded-lg hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 hover:text-white hover:border-green-600 transition-all font-semibold"
                    >
                      Set OFF
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-border/40">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-primary/10 to-blue-600/10 p-3">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                      {editing ? "Editar Câmara" : "Nova Câmara"}
                    </h3>
                    <p className="text-sm text-muted-foreground">Configure a câmara e defina zonas de interesse</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nome
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border-2 border-input rounded-xl bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                      placeholder="Ex: Câmara BZM 01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Equipamento
                    </label>
                    <select
                      value={form.machineId}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, machineId: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border-2 border-input rounded-xl bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    >
                      <option value="">— Sem associação —</option>
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      URL
                    </label>
                    <input
                      value={form.url}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, url: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border-2 border-input rounded-xl bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                      placeholder="rtsp://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Protocolo
                    </label>
                    <select
                      value={form.protocol}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          protocol: e.target.value as Protocol,
                        }))
                      }
                      className="w-full px-4 py-2.5 border-2 border-input rounded-xl bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    >
                      <option value="rtsp">RTSP</option>
                      <option value="http">HTTP</option>
                      <option value="webrtc">WebRTC</option>
                      <option value="file">Arquivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Ativa
                    </label>
                    <select
                      value={form.enabled ? "1" : "0"}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          enabled: e.target.value === "1",
                        }))
                      }
                      className="w-full px-4 py-2.5 border-2 border-input rounded-xl bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    >
                      <option value="1">Sim</option>
                      <option value="0">Não</option>
                    </select>
                  </div>
                </div>

                {/* ROI Visual Editor */}
                {form.url && (
                  <div className="border-2 border-border/40 rounded-2xl p-6 bg-gradient-to-br from-muted/30 to-transparent">
                    <button
                      type="button"
                      onClick={() => {
                        if (editing?.id) {
                          setSnapshotUrl(camerasService.getSnapshotUrl(editing.id) + '&t=' + Date.now());
                        }
                      }}
                      className="mb-4 px-3 py-1.5 text-sm border-2 border-input rounded-lg hover:bg-muted transition-all font-medium"
                    >
                      🔄 Atualizar Preview
                    </button>
                    <ROIEditor
                      cameraId={editing?.id}
                      snapshotUrl={snapshotUrl}
                      rois={form.rois}
                      onChange={(rois) => setForm({ ...form, rois })}
                    />
                  </div>
                )}

                {!form.url && (
                  <div className="border-2 border-dashed border-border/40 rounded-2xl p-8 bg-muted/20">
                    <div className="text-center text-muted-foreground">
                      <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-semibold">Configure a URL da câmara primeiro</p>
                      <p className="text-sm mt-1">Depois poderá definir as zonas de interesse</p>
                    </div>
                  </div>
                )}

                {/* Advanced Settings - Collapsed by default */}
                <details className="group">
                  <summary className="cursor-pointer font-semibold text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                    ⚙️ Configurações Avançadas (Limiares e Agenda)
                    <span className="text-xs opacity-50">Clique para expandir</span>
                  </summary>
                  <div className="grid gap-4 md:grid-cols-2 mt-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Limiares (JSON)
                      </label>
                      <textarea
                        value={thresholdsText}
                        onChange={(e) => setThresholdsText(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-input rounded-xl bg-background/50 font-mono text-xs focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all"
                        rows={4}
                      />
                      {jsonErrors.thresholds && (
                        <div className="text-xs text-red-600 mt-1">{jsonErrors.thresholds}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Agenda (JSON)
                      </label>
                      <textarea
                        value={scheduleText}
                        onChange={(e) => setScheduleText(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-input rounded-xl bg-background/50 font-mono text-xs focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all"
                        rows={4}
                      />
                      {jsonErrors.schedule && (
                        <div className="text-xs text-red-600 mt-1">{jsonErrors.schedule}</div>
                      )}
                    </div>
                  </div>
                </details>

                <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="px-5 py-2.5 border-2 border-input rounded-xl hover:bg-muted transition-all font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-primary via-blue-600 to-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] transition-all font-semibold"
                  >
                    {editing ? "💾 Guardar Câmara" : "✨ Criar Câmara"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
