import { Router } from "express";
import { query, isDbConfigured } from "../db";

const router = Router();

// Get all materials
router.get("/", async (req, res) => {
  try {
    if (!isDbConfigured()) {
      return res.json([]);
    }
    const result = await query(`
      SELECT m.*, e.name as equipment_name
      FROM materials m
      LEFT JOIN equipments e ON m.equipment_id = e.id
      ORDER BY m.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).json({ error: "Failed to fetch materials" });
  }
});

// Get material by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `
      SELECT m.*, e.name as equipment_name 
      FROM materials m
      LEFT JOIN equipments e ON m.equipment_id = e.id
      WHERE m.id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Material not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching material:", error);
    res.status(500).json({ error: "Failed to fetch material" });
  }
});

// Create material
router.post("/", async (req, res) => {
  try {
    const {
      name,
      code,
      category,
      unit,
      min_stock,
      current_stock,
      cost_per_unit,
      supplier,
      equipment_id,
      is_general_stock,
      notes,
    } = req.body;

    const result = await query(
      `
      INSERT INTO materials (
        name, code, category, unit, min_stock, current_stock,
        cost_per_unit, supplier, equipment_id, is_general_stock, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
      [
        name,
        code,
        category,
        unit,
        min_stock || 0,
        current_stock || 0,
        cost_per_unit || 0,
        supplier,
        equipment_id,
        is_general_stock !== false,
        notes,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating material:", error);
    res.status(500).json({ error: "Failed to create material" });
  }
});

// Update material
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      category,
      unit,
      min_stock,
      current_stock,
      cost_per_unit,
      supplier,
      equipment_id,
      is_general_stock,
      notes,
    } = req.body;

    const result = await query(
      `
      UPDATE materials
      SET name = $1, code = $2, category = $3, unit = $4, min_stock = $5,
          current_stock = $6, cost_per_unit = $7, supplier = $8,
          equipment_id = $9, is_general_stock = $10, notes = $11,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `,
      [
        name,
        code,
        category,
        unit,
        min_stock,
        current_stock,
        cost_per_unit,
        supplier,
        equipment_id,
        is_general_stock,
        notes,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Material not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating material:", error);
    res.status(500).json({ error: "Failed to update material" });
  }
});

// Delete material
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      "DELETE FROM materials WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Material not found" });
    }

    res.json({ message: "Material deleted successfully" });
  } catch (error) {
    console.error("Error deleting material:", error);
    res.status(500).json({ error: "Failed to delete material" });
  }
});

// Update stock quantity
router.patch("/:id/stock", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body; // operation: 'add' or 'subtract'

    const currentResult = await query(
      "SELECT current_stock FROM materials WHERE id = $1",
      [id],
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "Material not found" });
    }

    const currentStock = currentResult.rows[0].current_stock;
    const newStock =
      operation === "subtract"
        ? Math.max(0, currentStock - quantity)
        : currentStock + quantity;

    const result = await query(
      `
      UPDATE materials
      SET current_stock = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `,
      [newStock, id],
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ error: "Failed to update stock" });
  }
});

// Material Photos endpoints
// Create material_photos table
async function ensureMaterialPhotosTable() {
  if (!isDbConfigured()) return;
  await query(`CREATE TABLE IF NOT EXISTS material_photos (
    id TEXT PRIMARY KEY,
    material_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_data BYTEA,
    mime_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_material FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE
  )`);
}

// GET material photos
router.get("/:id/photos", async (req, res) => {
  try {
    if (!isDbConfigured()) return res.json([]);
    await ensureMaterialPhotosTable();

    const materialId = req.params.id;
    const result = await query(
      `SELECT id, material_id, file_name, file_size, mime_type, created_at
       FROM material_photos
       WHERE material_id = $1
       ORDER BY created_at DESC`,
      [materialId]
    );

    return res.json(result.rows.map((r: any) => ({
      id: r.id,
      material_id: r.material_id,
      file_name: r.file_name,
      file_size: r.file_size,
      mime_type: r.mime_type,
      created_at: r.created_at,
    })));
  } catch (e: any) {
    console.error("GET materials/:id/photos error:", e);
    return res.status(500).json({ error: e.message });
  }
});

// POST material photo (upload)
router.post("/:id/photos", async (req, res) => {
  try {
    if (!isDbConfigured())
      return res.status(400).json({ error: "Database not configured" });

    await ensureMaterialPhotosTable();

    const materialId = req.params.id;
    const { fileName, fileData, mimeType } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ error: "fileName and fileData are required" });
    }

    const photoId = `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const buffer = Buffer.from(fileData, 'base64');

    await query(
      `INSERT INTO material_photos (id, material_id, file_name, file_data, mime_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [photoId, materialId, fileName, buffer, mimeType || 'image/jpeg', buffer.length]
    );

    return res.json({ id: photoId, file_name: fileName });
  } catch (e: any) {
    console.error("POST materials/:id/photos error:", e);
    return res.status(500).json({ error: e.message });
  }
});

// GET material photo (download)
router.get("/:material_id/photos/:photo_id/download", async (req, res) => {
  try {
    if (!isDbConfigured())
      return res.status(400).json({ error: "Database not configured" });

    const { material_id, photo_id } = req.params;

    const result = await query(
      `SELECT file_name, file_data, mime_type FROM material_photos WHERE id = $1 AND material_id = $2`,
      [photo_id, material_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const file = result.rows[0];
    res.setHeader('Content-Type', file.mime_type || 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
    res.setHeader('Content-Length', file.file_data.length);
    res.send(file.file_data);
  } catch (e: any) {
    console.error("GET materials/:material_id/photos/:photo_id/download error:", e);
    return res.status(500).json({ error: e.message });
  }
});

// DELETE material photo
router.delete("/:material_id/photos/:photo_id", async (req, res) => {
  try {
    if (!isDbConfigured())
      return res.status(400).json({ error: "Database not configured" });

    const { material_id, photo_id } = req.params;

    await query(
      `DELETE FROM material_photos WHERE id = $1 AND material_id = $2`,
      [photo_id, material_id]
    );

    return res.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE materials/:material_id/photos/:photo_id error:", e);
    return res.status(500).json({ error: e.message });
  }
});

export default router;
