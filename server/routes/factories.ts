import express from "express";
import { isDbConfigured, query } from "../db";

export const factoriesRouter = express.Router();
factoriesRouter.use(express.json({ limit: "1mb" }));

let initPromise: Promise<boolean> | null = null;
async function ensureFactoriesTable(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await query(`CREATE TABLE IF NOT EXISTS factories (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )`);
      await query(
        `CREATE UNIQUE INDEX IF NOT EXISTS factories_name_key ON factories(name)`,
      );
      return true;
    } catch (e) {
      console.error("ensureFactoriesTable error", e);
      return false;
    }
  })();
  const ok = await initPromise;
  if (!ok) initPromise = null;
  return ok;
}

function toId(name: string) {
  const base = (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return base
    ? `${base}-${suffix}`
    : `fac-${Date.now().toString(36)}-${suffix}`;
}

factoriesRouter.get("/", async (_req, res) => {
  try {
    await ensureFactoriesTable();
    const { rows } = await query(
      `SELECT id, name, created_at FROM factories ORDER BY name ASC`,
    );
    return res.json(
      rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at })),
    );
  } catch (e: any) {
    if (isDbConfigured()) return res.status(500).json({ error: e.message });
    return res.json([]);
  }
});

factoriesRouter.post("/", async (req, res) => {
  const body = req.body || {};
  const name = (body.name || "").trim();
  let id = (body.id || "").trim();
  if (!name) {
    return res.status(400).json({ error: "Nome é obrigatório" });
  }
  try {
    await ensureFactoriesTable();
    if (!id) id = toId(name);
    await query(`INSERT INTO factories (id, name) VALUES ($1, $2)`, [id, name]);
    return res.json({ id, name });
  } catch (e: any) {
    const msg = (e && e.message) || "Erro";
    if (/unique/i.test(msg) || /duplicate/i.test(msg)) {
      return res.status(409).json({ error: "ID ou Nome já existe" });
    }
    if (isDbConfigured()) return res.status(500).json({ error: msg });
    return res.json({ id, name });
  }
});
