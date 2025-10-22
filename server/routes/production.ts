import express from "express";
import { query, isDbConfigured } from "../db";

export const productionRouter = express.Router();

let extrasInit: Promise<void> | null = null;
async function ensureExtrasTables() {
  if (extrasInit) return extrasInit;
  extrasInit = (async () => {
    try {
      // Base tables
      await query(`CREATE TABLE IF NOT EXISTS public.foam_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        density INT NOT NULL,
        hardness TEXT,
        color TEXT,
        specifications TEXT,
        price_per_m3 NUMERIC,
        stock_color TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`);
      await query(`CREATE TABLE IF NOT EXISTS public.product_sheets (
        id TEXT PRIMARY KEY,
        internal_reference TEXT NOT NULL,
        foam_type_id TEXT REFERENCES public.foam_types(id) ON DELETE SET NULL,
        standard_length INT,
        standard_width INT,
        standard_height INT,
        description TEXT,
        documents JSONB DEFAULT '[]'::jsonb,
        photos JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now()
      )`);

      // Foam blocks table
      await query(`CREATE TABLE IF NOT EXISTS public.foam_blocks (
        id TEXT PRIMARY KEY,
        production_number TEXT NOT NULL,
        foam_type_id TEXT REFERENCES public.foam_types(id) ON DELETE SET NULL,
        length_mm INT,
        width_mm INT,
        height_mm INT,
        volume NUMERIC,
        weight NUMERIC,
        production_date TIMESTAMPTZ,
        block_number TEXT,
        warehouse TEXT,
        status TEXT,
        quality_status TEXT,
        non_conformities JSONB DEFAULT '[]'::jsonb,
        comments TEXT,
        received_date TIMESTAMPTZ DEFAULT now(),
        received_by TEXT,
        reserved_for TEXT,
        consumed_date TIMESTAMPTZ,
        consumed_by TEXT,
        photos JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now()
      )`);

      // Ensure columns exist (idempotent migrations)
      await query(`ALTER TABLE public.foam_types
        ADD COLUMN IF NOT EXISTS hardness TEXT,
        ADD COLUMN IF NOT EXISTS color TEXT,
        ADD COLUMN IF NOT EXISTS specifications TEXT,
        ADD COLUMN IF NOT EXISTS price_per_m3 NUMERIC,
        ADD COLUMN IF NOT EXISTS stock_color TEXT,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`);

      await query(`ALTER TABLE public.product_sheets
        ADD COLUMN IF NOT EXISTS internal_reference TEXT,
        ADD COLUMN IF NOT EXISTS foam_type_id TEXT,
        ADD COLUMN IF NOT EXISTS standard_length INT,
        ADD COLUMN IF NOT EXISTS standard_width INT,
        ADD COLUMN IF NOT EXISTS standard_height INT,
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`);

      await query(`ALTER TABLE public.foam_blocks
        ADD COLUMN IF NOT EXISTS production_number TEXT,
        ADD COLUMN IF NOT EXISTS foam_type_id TEXT,
        ADD COLUMN IF NOT EXISTS length_mm INT,
        ADD COLUMN IF NOT EXISTS width_mm INT,
        ADD COLUMN IF NOT EXISTS height_mm INT,
        ADD COLUMN IF NOT EXISTS volume NUMERIC,
        ADD COLUMN IF NOT EXISTS weight NUMERIC,
        ADD COLUMN IF NOT EXISTS production_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS block_number TEXT,
        ADD COLUMN IF NOT EXISTS warehouse TEXT,
        ADD COLUMN IF NOT EXISTS status TEXT,
        ADD COLUMN IF NOT EXISTS quality_status TEXT,
        ADD COLUMN IF NOT EXISTS non_conformities JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS comments TEXT,
        ADD COLUMN IF NOT EXISTS received_date TIMESTAMPTZ DEFAULT now(),
        ADD COLUMN IF NOT EXISTS received_by TEXT,
        ADD COLUMN IF NOT EXISTS reserved_for TEXT,
        ADD COLUMN IF NOT EXISTS consumed_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS consumed_by TEXT,
        ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`);
    } catch (e) {
      console.error("ensureExtrasTables error", e);
    }
  })();
  await extrasInit;
}

// Foam Types
productionRouter.get("/foam-types", async (_req, res) => {
  try {
    await ensureExtrasTables();
    const { rows } = await query(
      `SELECT * FROM public.foam_types ORDER BY created_at DESC`,
    );
    return res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        density: r.density,
        hardness: r.hardness || "",
        color: r.color || "",
        specifications: r.specifications || "",
        pricePerM3: Number(r.price_per_m3 || 0),
        stockColor: r.stock_color || "#f8f9fa",
      })),
    );
  } catch (e: any) {
    console.error("GET /foam-types error", e);
    res.status(500).json({ error: e.message });
  }
});

function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

productionRouter.post("/foam-types", async (req, res) => {
  const d = req.body || {};
  const id = d.id || genId("foam");
  try {
    await ensureExtrasTables();
    await query(
      `INSERT INTO public.foam_types (id, name, density, hardness, color, specifications, price_per_m3, stock_color)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [
        id,
        d.name,
        d.density,
        d.hardness || null,
        d.color || null,
        d.specifications || null,
        d.pricePerM3 ?? null,
        d.stockColor || null,
      ],
    );
    res.json({ id });
  } catch (e: any) {
    console.error("POST /foam-types error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.patch("/foam-types/:id", async (req, res) => {
  const id = req.params.id;
  const d = req.body || {};
  try {
    await ensureExtrasTables();
    await query(
      `UPDATE public.foam_types SET name=COALESCE($2,name), density=COALESCE($3,density), hardness=COALESCE($4,hardness), color=COALESCE($5,color), specifications=COALESCE($6,specifications), price_per_m3=COALESCE($7,price_per_m3), stock_color=COALESCE($8,stock_color) WHERE id=$1`,
      [
        id,
        d.name,
        d.density,
        d.hardness,
        d.color,
        d.specifications,
        d.pricePerM3,
        d.stockColor,
      ],
    );
    res.json({ ok: true });
  } catch (e: any) {
    console.error("PATCH /foam-types/:id error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.delete("/foam-types/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await ensureExtrasTables();
    await query(`DELETE FROM public.foam_types WHERE id=$1`, [id]);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /foam-types/:id error", e);
    res.status(500).json({ error: e.message });
  }
});

// Product Sheets
productionRouter.get("/product-sheets", async (_req, res) => {
  try {
    await ensureExtrasTables();
    const { rows } =
      await query(`SELECT ps.*, ft.name as foam_name, ft.density as foam_density, ft.hardness as foam_hardness, ft.color as foam_color, ft.specifications as foam_specs, ft.price_per_m3 as foam_price, ft.stock_color as foam_stock_color
      FROM public.product_sheets ps LEFT JOIN public.foam_types ft ON ft.id = ps.foam_type_id ORDER BY ps.created_at DESC`);
    return res.json(
      rows.map((r) => ({
        id: r.id,
        internalReference: r.internal_reference,
        foamType: {
          id: r.foam_type_id,
          name: r.foam_name || "",
          density: r.foam_density || 0,
          hardness: r.foam_hardness || "",
          color: r.foam_color || "",
          specifications: r.foam_specs || "",
          pricePerM3: Number(r.foam_price || 0),
          stockColor: r.foam_stock_color || "#f8f9fa",
        },
        standardDimensions: {
          length: r.standard_length || 0,
          width: r.standard_width || 0,
          height: r.standard_height || 0,
        },
        description: r.description || "",
        documents: r.documents || [],
        photos: r.photos || [],
        createdAt: r.created_at || null,
      })),
    );
  } catch (e: any) {
    console.error("GET /product-sheets error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.post("/product-sheets", async (req, res) => {
  const d = req.body || {};
  const id = d.id || genId("ps");
  try {
    await ensureExtrasTables();
    await query(
      `INSERT INTO public.product_sheets (id, internal_reference, foam_type_id, standard_length, standard_width, standard_height, description, documents, photos) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::jsonb,'[]'::jsonb),COALESCE($9::jsonb,'[]'::jsonb)) ON CONFLICT (id) DO NOTHING`,
      [
        id,
        d.internalReference,
        d.foamTypeId || d.foamType?.id || null,
        d.standardDimensions?.length ?? null,
        d.standardDimensions?.width ?? null,
        d.standardDimensions?.height ?? null,
        d.description || null,
        d.documents ? JSON.stringify(d.documents) : null,
        d.photos ? JSON.stringify(d.photos) : null,
      ],
    );
    res.json({ id });
  } catch (e: any) {
    console.error("POST /product-sheets error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.patch("/product-sheets/:id", async (req, res) => {
  const id = req.params.id;
  const d = req.body || {};
  try {
    await ensureExtrasTables();
    await query(
      `UPDATE public.product_sheets SET internal_reference=COALESCE($2,internal_reference), foam_type_id=COALESCE($3,foam_type_id), standard_length=COALESCE($4,standard_length), standard_width=COALESCE($5,standard_width), standard_height=COALESCE($6,standard_height), description=COALESCE($7,description), documents=COALESCE($8::jsonb,documents), photos=COALESCE($9::jsonb,photos) WHERE id=$1`,
      [
        id,
        d.internalReference,
        d.foamTypeId || d.foamType?.id,
        d.standardDimensions?.length,
        d.standardDimensions?.width,
        d.standardDimensions?.height,
        d.description,
        d.documents ? JSON.stringify(d.documents) : null,
        d.photos ? JSON.stringify(d.photos) : null,
      ],
    );
    res.json({ ok: true });
  } catch (e: any) {
    console.error("PATCH /product-sheets/:id error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.delete("/product-sheets/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await ensureExtrasTables();
    await query(`DELETE FROM public.product_sheets WHERE id=$1`, [id]);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /product-sheets/:id error", e);
    res.status(500).json({ error: e.message });
  }
});

// Foam Blocks
productionRouter.get("/foam-blocks", async (req, res) => {
  try {
    await ensureExtrasTables();
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (req.query.warehouse && req.query.warehouse !== "all") {
      conditions.push(`b.warehouse = $${idx++}`);
      params.push(req.query.warehouse);
    }
    if (req.query.status) {
      conditions.push(`b.status = $${idx++}`);
      params.push(req.query.status);
    }
    if (req.query.qualityStatus) {
      conditions.push(`b.quality_status = $${idx++}`);
      params.push(req.query.qualityStatus);
    }
    if (req.query.foamType) {
      conditions.push(`ft.name ILIKE $${idx++}`);
      params.push(`%${req.query.foamType}%`);
    }
    if (req.query.productionNumber) {
      conditions.push(`b.production_number ILIKE $${idx++}`);
      params.push(`%${req.query.productionNumber}%`);
    }
    if (req.query.blockNumber) {
      conditions.push(`b.block_number ILIKE $${idx++}`);
      params.push(`%${req.query.blockNumber}%`);
    }
    if (req.query.startDate && req.query.endDate) {
      conditions.push(`b.production_date BETWEEN $${idx++} AND $${idx++}`);
      params.push(req.query.startDate, req.query.endDate);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query(
      `
      SELECT b.*, ft.name AS foam_name, ft.density AS foam_density, ft.hardness AS foam_hardness,
             ft.color AS foam_color, ft.specifications AS foam_specs, ft.price_per_m3 AS foam_price, ft.stock_color AS foam_stock_color
      FROM public.foam_blocks b
      LEFT JOIN public.foam_types ft ON ft.id = b.foam_type_id
      ${where}
      ORDER BY b.created_at DESC
    `,
      params,
    );

    return res.json(
      rows.map((r) => ({
        id: r.id,
        productionNumber: r.production_number,
        foamType: {
          id: r.foam_type_id,
          name: r.foam_name || "",
          density: r.foam_density || 0,
          hardness: r.foam_hardness || "",
          color: r.foam_color || "",
          specifications: r.foam_specs || "",
          pricePerM3: Number(r.foam_price || 0),
          stockColor: r.foam_stock_color || "#f8f9fa",
        },
        dimensions: {
          length: r.length_mm || 0,
          width: r.width_mm || 0,
          height: r.height_mm || 0,
        },
        volume: Number(r.volume || 0),
        weight: r.weight != null ? Number(r.weight) : undefined,
        productionDate: r.production_date
          ? new Date(r.production_date).toISOString()
          : null,
        blockNumber: r.block_number,
        warehouse: r.warehouse,
        status: r.status,
        qualityStatus: r.quality_status,
        nonConformities: r.non_conformities || [],
        comments: r.comments || "",
        receivedDate: r.received_date
          ? new Date(r.received_date).toISOString()
          : null,
        receivedBy: r.received_by || "",
        reservedFor: r.reserved_for || undefined,
        consumedDate: r.consumed_date
          ? new Date(r.consumed_date).toISOString()
          : undefined,
        consumedBy: r.consumed_by || undefined,
        photos: r.photos || [],
      })),
    );
  } catch (e: any) {
    console.error("GET /foam-blocks error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.post("/foam-blocks", async (req, res) => {
  const d = req.body || {};
  const id = d.id || genId("fblk");
  try {
    await ensureExtrasTables();
    const volume =
      ((d.dimensions?.length || 0) *
        (d.dimensions?.width || 0) *
        (d.dimensions?.height || 0)) /
      1_000_000;
    await query(
      `INSERT INTO public.foam_blocks (id, production_number, foam_type_id, length_mm, width_mm, height_mm, volume, weight, production_date, block_number, warehouse, status, quality_status, non_conformities, comments, received_date, received_by, reserved_for, consumed_date, consumed_by, photos)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,COALESCE($14::jsonb,'[]'::jsonb),$15, now(), $16, $17, $18, $19, COALESCE($20::jsonb,'[]'::jsonb))
      ON CONFLICT (id) DO NOTHING`,
      [
        id,
        d.productionNumber,
        d.foamType?.id || d.foamTypeId || null,
        d.dimensions?.length ?? null,
        d.dimensions?.width ?? null,
        d.dimensions?.height ?? null,
        volume,
        d.weight ?? null,
        d.productionDate ?? null,
        d.blockNumber ?? null,
        d.warehouse ?? null,
        d.status ?? "available",
        d.qualityStatus ?? "pending",
        d.nonConformities ? JSON.stringify(d.nonConformities) : null,
        d.comments || null,
        d.receivedBy || null,
        d.reservedFor || null,
        d.consumedDate || null,
        d.consumedBy || null,
        d.photos ? JSON.stringify(d.photos) : null,
      ],
    );
    res.json({ id });
  } catch (e: any) {
    console.error("POST /foam-blocks error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.patch("/foam-blocks/:id", async (req, res) => {
  const id = req.params.id;
  const d = req.body || {};
  try {
    await ensureExtrasTables();
    const volume =
      ((d.dimensions?.length || d.length_mm || 0) *
        (d.dimensions?.width || d.width_mm || 0) *
        (d.dimensions?.height || d.height_mm || 0)) /
      1_000_000;
    await query(
      `UPDATE public.foam_blocks SET
      production_number = COALESCE($2, production_number),
      foam_type_id = COALESCE($3, foam_type_id),
      length_mm = COALESCE($4, length_mm),
      width_mm = COALESCE($5, width_mm),
      height_mm = COALESCE($6, height_mm),
      volume = COALESCE($7, volume),
      weight = COALESCE($8, weight),
      production_date = COALESCE($9, production_date),
      block_number = COALESCE($10, block_number),
      warehouse = COALESCE($11, warehouse),
      status = COALESCE($12, status),
      quality_status = COALESCE($13, quality_status),
      non_conformities = COALESCE($14::jsonb, non_conformities),
      comments = COALESCE($15, comments),
      received_by = COALESCE($16, received_by),
      reserved_for = COALESCE($17, reserved_for),
      consumed_date = COALESCE($18, consumed_date),
      consumed_by = COALESCE($19, consumed_by),
      photos = COALESCE($20::jsonb, photos)
      WHERE id=$1`,
      [
        id,
        d.productionNumber,
        d.foamType?.id || d.foamTypeId,
        d.dimensions?.length ?? d.length_mm,
        d.dimensions?.width ?? d.width_mm,
        d.dimensions?.height ?? d.height_mm,
        isNaN(volume) || volume === 0 ? null : volume,
        d.weight,
        d.productionDate,
        d.blockNumber,
        d.warehouse,
        d.status,
        d.qualityStatus,
        d.nonConformities ? JSON.stringify(d.nonConformities) : null,
        d.comments,
        d.receivedBy,
        d.reservedFor,
        d.consumedDate,
        d.consumedBy,
        d.photos ? JSON.stringify(d.photos) : null,
      ],
    );
    res.json({ ok: true });
  } catch (e: any) {
    console.error("PATCH /foam-blocks/:id error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.delete("/foam-blocks/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await ensureExtrasTables();
    await query(`DELETE FROM public.foam_blocks WHERE id=$1`, [id]);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /foam-blocks/:id error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.get("/stock/summary", async (_req, res) => {
  try {
    await ensureExtrasTables();
    const total = await query(
      `SELECT COUNT(*)::int AS blocks, COALESCE(SUM(volume),0)::float8 AS total_volume FROM public.foam_blocks`,
    );
    const byWarehouse = await query(
      `SELECT warehouse, COUNT(*)::int AS blocks, COALESCE(SUM(volume),0)::float8 AS volume FROM public.foam_blocks GROUP BY warehouse`,
    );
    const byStatus = await query(
      `SELECT status, COUNT(*)::int AS blocks FROM public.foam_blocks GROUP BY status`,
    );
    return res.json({
      totalBlocks: total.rows[0]?.blocks || 0,
      totalVolume: Number(total.rows[0]?.total_volume || 0),
      byWarehouse: byWarehouse.rows,
      byStatus: byStatus.rows,
    });
  } catch (e: any) {
    console.error("GET /stock/summary error", e);
    res.status(500).json({ error: e.message });
  }
});

// Orders CRUD (nested)
productionRouter.get("/orders", async (req, res) => {
  try {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (req.query.createdBy) {
      conditions.push(`created_by = $${idx++}`);
      params.push(req.query.createdBy);
    }
    if (req.query.customer) {
      conditions.push(`customer_name ILIKE $${idx++}`);
      params.push(`%${req.query.customer}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const ordersRes = await query(
      `SELECT * FROM production_orders ${where} ORDER BY created_at DESC`,
      params,
    );
    const linesRes = await query(`SELECT * FROM production_order_lines`);
    const opsRes = await query(`SELECT * FROM cutting_operations`);

    const linesByOrder = new Map<string, any[]>();
    for (const l of linesRes.rows) {
      const arr = linesByOrder.get(l.order_id) || [];
      arr.push(l);
      linesByOrder.set(l.order_id, arr);
    }
    const opsByLine = new Map<string, any[]>();
    for (const o of opsRes.rows) {
      const arr = opsByLine.get(o.line_id) || [];
      arr.push(o);
      opsByLine.set(o.line_id, arr);
    }

    const result = ordersRes.rows.map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number,
      customer: { id: o.customer_name, name: o.customer_name, contact: "" },
      expectedDeliveryDate: o.expected_delivery_date,
      status: o.status,
      priority: o.priority,
      totalVolume: Number(o.total_volume || 0),
      estimatedCost: Number(o.estimated_cost || 0),
      notes: o.notes || "",
      createdBy: o.created_by || "Admin",
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      completedAt: o.completed_at,
      shippedAt: o.shipped_at,
      lines: (linesByOrder.get(o.id) || []).map((l: any) => ({
        id: l.id,
        foamType: {
          id: l.foam_type_name || "foam",
          name: l.foam_type_name || "Espuma",
          density: 0,
          hardness: "",
          color: "",
          specifications: "",
          pricePerM3: 0,
        },
        initialDimensions: {
          length: l.final_length_mm,
          width: l.final_width_mm,
          height: l.final_height_mm,
        },
        finalDimensions: {
          length: l.final_length_mm,
          width: l.final_width_mm,
          height: l.final_height_mm,
        },
        quantity: l.quantity || 0,
        completedQuantity: l.completed_quantity || 0,
        cuttingOperations: (opsByLine.get(l.id) || []).map((op: any) => ({
          id: op.id,
          machineId: op.machine_id,
          inputDimensions: {
            length: op.input_length_mm || 0,
            width: op.input_width_mm || 0,
            height: op.input_height_mm || 0,
          },
          outputDimensions: {
            length: op.output_length_mm || 0,
            width: op.output_width_mm || 0,
            height: op.output_height_mm || 0,
          },
          quantity: op.quantity || 0,
          completedQuantity: op.completed_quantity || 0,
          estimatedTime: op.estimated_time || 0,
          status: op.status || "pending",
          observations: op.observations || "",
        })),
        status: l.status || "pending",
        priority: 5,
        shippedAt: l.shipped_at,
      })),
    }));

    res.json(result);
  } catch (e: any) {
    console.error("GET /orders error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.post("/orders", async (req, res) => {
  try {
    const o = req.body;
    const id = o.id || `OP-${Date.now()}`;
    await query(
      `INSERT INTO production_orders (id, order_number, customer_name, expected_delivery_date, status, priority, total_volume, estimated_cost, notes, created_by, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now())
      ON CONFLICT (id) DO NOTHING`,
      [
        id,
        o.orderNumber,
        o.customer?.name || "",
        o.expectedDeliveryDate,
        o.status || "created",
        o.priority || "medium",
        o.totalVolume || 0,
        o.estimatedCost || 0,
        o.notes || "",
        o.createdBy || "Admin",
      ],
    );

    for (const line of o.lines || []) {
      const lineId =
        line.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await query(
        `INSERT INTO production_order_lines (id, order_id, foam_type_name, final_length_mm, final_width_mm, final_height_mm, quantity, status, completed_quantity)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO NOTHING`,
        [
          lineId,
          id,
          line.foamType?.name || "Espuma",
          line.finalDimensions.length,
          line.finalDimensions.width,
          line.finalDimensions.height,
          line.quantity || 0,
          line.status || "pending",
          line.completedQuantity || 0,
        ],
      );
      for (const op of line.cuttingOperations || []) {
        const opId = op.id || `${Date.now()}-op`;
        await query(
          `INSERT INTO cutting_operations (id, line_id, machine_id, input_length_mm, input_width_mm, input_height_mm, output_length_mm, output_width_mm, output_height_mm, quantity, completed_quantity, status, estimated_time, observations)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
          ON CONFLICT (id) DO NOTHING`,
          [
            opId,
            lineId,
            op.machineId,
            op.inputDimensions.length,
            op.inputDimensions.width,
            op.inputDimensions.height,
            op.outputDimensions.length,
            op.outputDimensions.width,
            op.outputDimensions.height,
            op.quantity || 0,
            op.completedQuantity || 0,
            op.status || "pending",
            op.estimatedTime || 0,
            op.observations || "",
          ],
        );
      }
    }

    res.json({ id });
  } catch (e: any) {
    console.error("POST /orders error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.patch("/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const o = req.body;
    await query(
      `UPDATE production_orders SET order_number=COALESCE($2,order_number), customer_name=COALESCE($3,customer_name), expected_delivery_date=COALESCE($4,expected_delivery_date), status=COALESCE($5,status), priority=COALESCE($6,priority), total_volume=COALESCE($7,total_volume), estimated_cost=COALESCE($8,estimated_cost), notes=COALESCE($9,notes), updated_at=now() WHERE id=$1`,
      [
        id,
        o.orderNumber,
        o.customer?.name,
        o.expectedDeliveryDate,
        o.status,
        o.priority,
        o.totalVolume,
        o.estimatedCost,
        o.notes,
      ],
    );

    // Update nested lines and operations if provided
    if (o.lines && Array.isArray(o.lines)) {
      for (const line of o.lines) {
        if (line.id) {
          await query(
            `UPDATE production_order_lines SET status=COALESCE($2,status), completed_quantity=COALESCE($3,completed_quantity), shipped_at=COALESCE($4,shipped_at) WHERE id=$1`,
            [line.id, line.status, line.completedQuantity, line.shippedAt],
          );

          // Update operations within this line
          if (line.cuttingOperations && Array.isArray(line.cuttingOperations)) {
            for (const op of line.cuttingOperations) {
              if (op.id) {
                await query(
                  `UPDATE cutting_operations SET completed_quantity=COALESCE($2,completed_quantity), status=COALESCE($3,status), observations=COALESCE($4,observations) WHERE id=$1`,
                  [op.id, op.completedQuantity, op.status, op.observations],
                );
              }
            }
          }
        }
      }
    }

    res.json({ ok: true });
  } catch (e: any) {
    console.error("PATCH /orders/:id error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.delete("/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await query(`DELETE FROM production_orders WHERE id=$1`, [id]);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /orders/:id error", e);
    res.status(500).json({ error: e.message });
  }
});

// Machines CRUD
productionRouter.get("/machines", async (_req, res) => {
  try {
    await query(
      `UPDATE machines SET current_operator = NULL WHERE id = 'carousel-001' AND current_operator = 'João Silva'`,
    );
    let { rows } = await query(`SELECT id, name, type, status,
      max_length_mm, max_width_mm, max_height_mm, cutting_precision,
      current_operator, last_maintenance, operating_hours, specifications
      FROM machines ORDER BY name`);

    // Seed default machines if empty (first run after Neon migration)
    if (!rows || rows.length === 0) {
      const defaults = [
        {
          id: "bzm-001",
          name: "BZM-01",
          type: "BZM",
          status: "available",
          max_length_mm: 4200,
          max_width_mm: 2000,
          max_height_mm: 2000,
          cutting_precision: 1.0,
          current_operator: null,
          last_maintenance: new Date().toISOString(),
          operating_hours: 1250,
          specifications: "Corte Inicial",
        },
        {
          id: "carousel-001",
          name: "Carrossel-01",
          type: "CAROUSEL",
          status: "busy",
          max_length_mm: 2500,
          max_width_mm: 1800,
          max_height_mm: 1500,
          cutting_precision: 2.0,
          current_operator: null,
          last_maintenance: new Date().toISOString(),
          operating_hours: 980,
          specifications: "Coxins",
        },
        {
          id: "pre-cnc-001",
          name: "Pré-CNC-01",
          type: "PRE_CNC",
          status: "available",
          max_length_mm: 2500,
          max_width_mm: 1500,
          max_height_mm: 1200,
          cutting_precision: 1.0,
          current_operator: null,
          last_maintenance: new Date().toISOString(),
          operating_hours: 1680,
          specifications: "Pré-processamento",
        },
        {
          id: "cnc-001",
          name: "CNC-01",
          type: "CNC",
          status: "maintenance",
          max_length_mm: 1200,
          max_width_mm: 1200,
          max_height_mm: 600,
          cutting_precision: 0.5,
          current_operator: null,
          last_maintenance: new Date().toISOString(),
          operating_hours: 2150,
          specifications: "Acabamento",
        },
      ];

      for (const m of defaults) {
        await query(
          `INSERT INTO machines (id, name, type, status, max_length_mm, max_width_mm, max_height_mm, cutting_precision, current_operator, last_maintenance, operating_hours, specifications)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          ON CONFLICT (id) DO NOTHING`,
          [
            m.id,
            m.name,
            m.type,
            m.status,
            m.max_length_mm,
            m.max_width_mm,
            m.max_height_mm,
            m.cutting_precision,
            m.current_operator,
            m.last_maintenance,
            m.operating_hours,
            m.specifications,
          ],
        );
      }
      const seeded = await query(`SELECT id, name, type, status,
        max_length_mm, max_width_mm, max_height_mm, cutting_precision,
        current_operator, last_maintenance, operating_hours, specifications
        FROM machines ORDER BY name`);
      rows = seeded.rows;
    }

    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        status: r.status,
        maxDimensions: {
          length: r.max_length_mm,
          width: r.max_width_mm,
          height: r.max_height_mm,
        },
        cuttingPrecision: Number(r.cutting_precision ?? 0),
        currentOperator: r.current_operator,
        lastMaintenance: r.last_maintenance,
        operatingHours: r.operating_hours,
        specifications: r.specifications,
      })),
    );
  } catch (e: any) {
    console.error("GET /machines error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.post("/machines", async (req, res) => {
  try {
    const m = req.body;
    const id = m.id || `${(m.type || "machine").toLowerCase()}-${Date.now()}`;
    await query(
      `INSERT INTO machines (id, name, type, status, max_length_mm, max_width_mm, max_height_mm, cutting_precision, current_operator, last_maintenance, operating_hours, specifications)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (id) DO NOTHING`,
      [
        id,
        m.name,
        m.type,
        m.status,
        m.maxDimensions?.length,
        m.maxDimensions?.width,
        m.maxDimensions?.height,
        m.cuttingPrecision,
        m.currentOperator || null,
        m.lastMaintenance || new Date().toISOString(),
        m.operatingHours || 0,
        m.specifications || "",
      ],
    );
    res.json({ id });
  } catch (e: any) {
    console.error("POST /machines error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.patch("/machines/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const m = req.body;
    await query(
      `UPDATE machines SET 
      name = COALESCE($2,name), type = COALESCE($3,type), status = COALESCE($4,status),
      max_length_mm = COALESCE($5,max_length_mm), max_width_mm = COALESCE($6,max_width_mm), max_height_mm = COALESCE($7,max_height_mm),
      cutting_precision = COALESCE($8,cutting_precision), current_operator = COALESCE($9,current_operator),
      last_maintenance = COALESCE($10,last_maintenance), operating_hours = COALESCE($11,operating_hours), specifications = COALESCE($12,specifications)
      WHERE id = $1`,
      [
        id,
        m.name,
        m.type,
        m.status,
        m.maxDimensions?.length,
        m.maxDimensions?.width,
        m.maxDimensions?.height,
        m.cuttingPrecision,
        m.currentOperator || null,
        m.lastMaintenance || null,
        m.operatingHours,
        m.specifications,
      ],
    );
    res.json({ ok: true });
  } catch (e: any) {
    console.error("PATCH /machines/:id error", e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.delete("/machines/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await query(`DELETE FROM machines WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /machines/:id error", e);
    res.status(500).json({ error: e.message });
  }
});

// Alias: /equipment -> /machines (for backward compatibility)
productionRouter.get("/equipment", async (req, res) => {
  try {
    if (!isDbConfigured()) {
      return res.json([]);
    }
    const { rows } = await query(`SELECT
      id, name, type as equipment_type, '' as manufacturer, '' as model,
      '' as serial_number, created_at as installation_date, '' as location,
      status, '' as notes, created_at
      FROM machines ORDER BY name`);
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        equipment_type: r.equipment_type || "",
        manufacturer: r.manufacturer || "",
        model: r.model || "",
        serial_number: r.serial_number || "",
        installation_date: r.installation_date,
        location: r.location || "",
        status: r.status,
        notes: r.notes || "",
        created_at: r.created_at,
      })),
    );
  } catch (e: any) {
    console.error("GET /equipment error", e);
    res.status(500).json({ error: e.message });
  }
});

// Users endpoint (placeholder)
productionRouter.get("/users", async (_req, res) => {
  try {
    if (!isDbConfigured()) {
      return res.json([]);
    }
    const { rows } = await query(
      `SELECT id, full_name, email, role, created_at FROM users ORDER BY full_name`,
    );
    res.json(rows);
  } catch (e: any) {
    console.error("GET /users error", e);
    res.status(500).json({ error: e.message });
  }
});
