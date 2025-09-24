import { useEffect, useMemo, useState } from "react";
import { camerasService, CameraRecord } from "@/services/camerasService";
import { productionService } from "@/services/productionService";
import { Plus, X, Trash2, Edit, Video, Link as LinkIcon } from "lucide-react";

interface MachineOption { id: string; name: string }

type Protocol = "rtsp" | "http" | "webrtc" | "file";

export default function CamerasPage() {
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CameraRecord | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    id: "",
    name: "",
    url: "",
    protocol: "rtsp" as Protocol,
    machineId: "" as string | "",
    enabled: true,
    rois: [] as any[],
    thresholds: {} as Record<string, any>,
    schedule: {} as Record<string, any>,
  });

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ id: "", name: "", url: "", protocol: "rtsp", machineId: "", enabled: true, rois: [], thresholds: {}, schedule: {} });
    setEditing(null);
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return cameras.filter((c) =>
      c.name.toLowerCase().includes(term) || c.url.toLowerCase().includes(term) || (machines.find(m => m.id === (c.machineId || ""))?.name?.toLowerCase() || "").includes(term),
    );
  }, [search, cameras, machines]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.url) { alert("Preencha nome e URL"); return; }
    try {
      if (editing) {
        await camerasService.update(editing.id, {
          name: form.name,
          url: form.url,
          protocol: form.protocol,
          machineId: form.machineId || null,
          enabled: form.enabled,
          rois: form.rois,
          thresholds: form.thresholds,
          schedule: form.schedule,
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
          thresholds: form.thresholds,
          schedule: form.schedule,
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
      rois: c.rois || [],
      thresholds: c.thresholds || {},
      schedule: c.schedule || {},
    });
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

  if (loading) return <div className="p-6 text-muted-foreground">Carregando câmaras…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Câmaras</h1>
          <p className="text-muted-foreground">Associe câmaras aos equipamentos e configure rapidamente.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nova Câmara
        </button>
      </div>

      <div className="flex gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por nome, URL ou equipamento" className="flex-1 px-3 py-2 border rounded-lg bg-background" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const machineName = machines.find((m) => m.id === (c.machineId || ""))?.name || "—";
          return (
            <div key={c.id} className="border rounded-lg p-4 bg-card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold">{c.name}</h3>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <LinkIcon className="h-3 w-3" /> {c.url}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => onEdit(c)} className="p-1 text-muted-foreground hover:text-foreground" title="Editar"><Edit className="h-4 w-4"/></button>
                  <button onClick={() => onDelete(c.id)} className="p-1 text-muted-foreground hover:text-destructive" title="Remover"><Trash2 className="h-4 w-4"/></button>
                </div>
              </div>
              <div className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Equipamento</span>
                  <span className="font-medium">{machineName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Protocolo</span>
                  <span className="font-medium">{c.protocol || "rtsp"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ativa</span>
                  <span className="font-medium">{c.enabled !== false ? "Sim" : "Não"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">{editing ? "Editar Câmara" : "Nova Câmara"}</h3>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="text-muted-foreground hover:text-foreground"><X/></button>
              </div>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nome</label>
                    <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg bg-background" placeholder="Ex: Câmara BZM 01" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Equipamento</label>
                    <select value={form.machineId} onChange={(e) => setForm((p) => ({ ...p, machineId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg bg-background">
                      <option value="">— Sem associação —</option>
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">URL</label>
                    <input value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} className="w-full px-3 py-2 border rounded-lg bg-background" placeholder="rtsp://..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Protocolo</label>
                    <select value={form.protocol} onChange={(e) => setForm((p) => ({ ...p, protocol: e.target.value as Protocol }))} className="w-full px-3 py-2 border rounded-lg bg-background">
                      <option value="rtsp">RTSP</option>
                      <option value="http">HTTP</option>
                      <option value="webrtc">WebRTC</option>
                      <option value="file">Arquivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Ativa</label>
                    <select value={form.enabled ? "1" : "0"} onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.value === "1" }))} className="w-full px-3 py-2 border rounded-lg bg-background">
                      <option value="1">Sim</option>
                      <option value="0">Não</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">ROI (JSON opcional)</label>
                  <textarea value={JSON.stringify(form.rois || [], null, 2)} onChange={(e) => {
                    try { const v = JSON.parse(e.target.value); setForm((p) => ({ ...p, rois: Array.isArray(v) ? v : [] })); } catch {}
                  }} className="w-full px-3 py-2 border rounded-lg bg-background font-mono text-xs" rows={4} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">Limiares (JSON)</label>
                    <textarea value={JSON.stringify(form.thresholds || {}, null, 2)} onChange={(e) => {
                      try { const v = JSON.parse(e.target.value); setForm((p) => ({ ...p, thresholds: v && typeof v === 'object' ? v : {} })); } catch {}
                    }} className="w-full px-3 py-2 border rounded-lg bg-background font-mono text-xs" rows={4} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Agenda (JSON)</label>
                    <textarea value={JSON.stringify(form.schedule || {}, null, 2)} onChange={(e) => {
                      try { const v = JSON.parse(e.target.value); setForm((p) => ({ ...p, schedule: v && typeof v === 'object' ? v : {} })); } catch {}
                    }} className="w-full px-3 py-2 border rounded-lg bg-background font-mono text-xs" rows={4} />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 border rounded-lg hover:bg-muted">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">{editing ? "Guardar" : "Criar"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
