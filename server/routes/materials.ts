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

export default router;
