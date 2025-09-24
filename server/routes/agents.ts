import express from "express";
import { isDbConfigured, query } from "../db";

export const agentsRouter = express.Router();

function tokenize(q: string): string[] {
  return (q || "")
    .toLowerCase()
    .replace(/[^a-z0-9áàâãéêíóôõúç\s_-]+/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function score(text: string, tokens: string[]): number {
  const t = text.toLowerCase();
  let s = 0;
  for (const tok of tokens) if (t.includes(tok)) s += 1;
  return s;
}

async function ragSearch(question: string, machineId?: string, limit = 8) {
  const tokens = tokenize(question);
  const sources: any[] = [];

  if (isDbConfigured()) {
    // Maintenance alerts
    try {
      const { rows } = await query<any>(
        `SELECT id, machine_id, machine_name, title, description, urgency_level, status, created_at
         FROM maintenance_alerts
         ORDER BY created_at DESC LIMIT 100`,
      );
      for (const r of rows) {
        const text = `${r.title} ${r.description || ""} ${r.machine_name || ""}`;
        const s = score(text, tokens) + (machineId && r.machine_id === machineId ? 2 : 0);
        if (s > 0) sources.push({ type: "maintenance_alert", id: r.id, score: s, text, meta: r });
      }
    } catch {}

    // Maintenance requests
    try {
      const { rows } = await query<any>(
        `SELECT id, machine_id, machine_name, title, description, category, status, requested_at
         FROM maintenance_requests ORDER BY requested_at DESC LIMIT 100`,
      );
      for (const r of rows) {
        const text = `${r.title} ${r.description || ""} ${r.category || ""}`;
        const s = score(text, tokens) + (machineId && r.machine_id === machineId ? 2 : 0);
        if (s > 0) sources.push({ type: "maintenance_request", id: r.id, score: s, text, meta: r });
      }
    } catch {}

    // Downtime
    try {
      const { rows } = await query<any>(
        `SELECT id, machine_id, machine_name, reason, description, start_time, end_time, status
         FROM machine_downtime ORDER BY start_time DESC LIMIT 100`,
      );
      for (const r of rows) {
        const text = `${r.reason || ""} ${r.description || ""}`;
        const s = score(text, tokens) + (machineId && r.machine_id === machineId ? 2 : 0);
        if (s > 0) sources.push({ type: "downtime", id: r.id, score: s, text, meta: r });
      }
    } catch {}

    // Production orders
    try {
      const { rows } = await query<any>(
        `SELECT id, order_number, customer, status, notes FROM production_orders ORDER BY created_at DESC LIMIT 100`,
      );
      for (const r of rows) {
        const text = `${r.order_number} ${r.customer || ""} ${r.status || ""} ${r.notes || ""}`;
        const s = score(text, tokens);
        if (s > 0) sources.push({ type: "production_order", id: r.id, score: s, text, meta: r });
      }
    } catch {}
  }

  // Fallback: no DB -> heuristic canned answers
  if (!isDbConfigured()) {
    sources.push({ type: "info", id: "no-db", score: 1, text: "Base de dados não configurada. Resultados limitados." });
  }

  // Rank and slice
  sources.sort((a, b) => b.score - a.score);
  const top = sources.slice(0, limit);

  const answer = top.length
    ? `Encontrei ${top.length} referência(s) relevante(s).` + (machineId ? ` Foco na máquina ${machineId}.` : "")
    : `Não encontrei referências diretas. Tente ser mais específico (ex.: máquina, período, categoria).`;

  return { answer, sources: top };
}

function triage(event: { type: string; machineId?: string; metric?: string; value?: number; severity?: string; message?: string; }): { priority: string; actions: string[]; rationale: string } {
  const actions: string[] = [];
  let priority = "medium";
  const sev = (event.severity || "").toLowerCase();

  if (sev === "critical" || sev === "alta" || sev === "high") priority = "high";
  if (sev === "low" || sev === "baixa") priority = "low";

  if (event.type === "downtime") {
    priority = priority === "low" ? "medium" : priority;
    actions.push("Abrir ocorrência de downtime", "Notificar manutenção", "Registar início e motivo");
  } else if (event.type === "alert") {
    actions.push("Confirmar leitura do alerta", "Verificar sensor/limiares", "Relacionar com manutenções pendentes");
  } else if (event.type === "maintenance_request") {
    actions.push("Classificar prioridade", "Agendar técnico", "Anexar fotos/documentos");
  } else {
    actions.push("Registar evento", "Avaliar impacto na produção");
  }

  if (event.metric && typeof event.value === "number") {
    actions.push(`Verificar métrica ${event.metric} (valor: ${event.value})`);
  }
  if (event.machineId) actions.push(`Focar na máquina ${event.machineId}`);

  const rationale = `Triage baseada em regras simples considerando tipo='${event.type}', severidade='${sev}'.`;
  return { priority, actions, rationale };
}

// POST /agents/ask { question, machineId?, limit? }
agentsRouter.post("/agents/ask", async (req, res) => {
  try {
    const { question, machineId, limit } = req.body || {};
    if (!question || String(question).trim().length < 3)
      return res.status(400).json({ error: "Questão é obrigatória" });
    const result = await ragSearch(String(question), machineId ? String(machineId) : undefined, Math.max(1, Math.min(20, Number(limit) || 8)));
    res.json(result);
  } catch (e: any) {
    console.error("POST /agents/ask error", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /agents/triage { type, machineId?, metric?, value?, severity?, message? }
agentsRouter.post("/agents/triage", async (req, res) => {
  try {
    const ev = req.body || {};
    if (!ev.type) return res.status(400).json({ error: "Tipo do evento é obrigatório" });
    const result = triage(ev);
    res.json(result);
  } catch (e: any) {
    console.error("POST /agents/triage error", e);
    res.status(500).json({ error: e.message });
  }
});
