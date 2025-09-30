export type NestPart = {
  length: number; // mm
  width: number; // mm
  height: number; // mm (espessura)
  quantity: number;
  foamTypeId?: string;
  label?: string;
};

export type Sheet = {
  length: number; // mm
  width: number; // mm
  kerf: number; // mm
  margin: number; // mm
};

export type PlacedPart = NestPart & { x: number; y: number; sheetIndex: number };

export type NestResult = {
  placements: PlacedPart[];
  sheetsUsed: number;
  utilization: number; // 0..1 total area utilization
};

// Simple shelf (guillotine) packing: sorts by height desc and packs rows.
export function packRectangles(parts: NestPart[], sheet: Sheet): NestResult {
  // Expand quantities to individual items with reference
  const expanded: NestPart[] = [];
  for (const p of parts) {
    for (let i = 0; i < Math.max(0, Math.floor(p.quantity)); i++) {
      expanded.push({ ...p, quantity: 1 });
    }
  }
  // Sort by max dimension (descending) to improve packing a bit
  expanded.sort((a, b) => Math.max(b.length, b.width) - Math.max(a.length, a.width));

  const placements: PlacedPart[] = [];
  const areaSheet = (sheet.length - 2 * sheet.margin) * (sheet.width - 2 * sheet.margin);
  let usedAreaTotal = 0;

  let sheetIndex = 0;
  let cursorY = sheet.margin;
  let rowHeight = 0;
  let cursorX = sheet.margin;

  const nextSheet = () => {
    sheetIndex++;
    cursorY = sheet.margin;
    rowHeight = 0;
    cursorX = sheet.margin;
  };

  for (const item of expanded) {
    const w = item.width + sheet.kerf;
    const h = item.length + sheet.kerf; // treat length as vertical for consistency

    // If first item of sheet, set rowHeight
    if (rowHeight === 0) rowHeight = h;

    // Move to next row if overflow horizontally
    if (cursorX + w > sheet.width - sheet.margin) {
      cursorX = sheet.margin;
      cursorY += rowHeight;
      rowHeight = h;
    }
    // If overflow vertically -> new sheet
    if (cursorY + h > sheet.length - sheet.margin) {
      nextSheet();
    }
    // If after moving sheet, still too big, force new sheet and place at origin
    if (cursorX + w > sheet.width - sheet.margin || cursorY + h > sheet.length - sheet.margin) {
      nextSheet();
    }

    placements.push({ ...item, x: cursorX, y: cursorY, sheetIndex });
    usedAreaTotal += item.length * item.width;
    cursorX += w;
    rowHeight = Math.max(rowHeight, h);
  }

  const sheetsUsed = sheetIndex + 1;
  const utilization = Math.min(1, usedAreaTotal / Math.max(1, sheetsUsed * areaSheet));
  return { placements, sheetsUsed, utilization };
}

// Minimal DXF rectangle extractor: looks for LWPOLYLINE closed with 4 vertices axis-aligned
export function parseDxfRectangles(dxfContent: string, defaultHeight = 50): NestPart[] {
  // Extremely simplified DXF parsing — not full spec compliant. Extract vertices from LWPOLYLINE sections.
  const parts: NestPart[] = [];
  const sections = dxfContent.split(/ENDSEC/i);
  for (const sec of sections) {
    if (!/LWPOLYLINE/i.test(sec)) continue;
    // Collect vertices (x=10, y=20 codes appear per vertex in DXF ENTITIES)
    const xs = Array.from(sec.matchAll(/\n\s*10\s*\n\s*([\-\d\.]+)/g)).map((m) => Number(m[1]));
    const ys = Array.from(sec.matchAll(/\n\s*20\s*\n\s*([\-\d\.]+)/g)).map((m) => Number(m[1]));
    const closed = /\n\s*70\s*\n\s*(\d+)/.exec(sec);
    const isClosed = closed ? (Number(closed[1]) & 1) === 1 : false;
    if (!isClosed || xs.length < 4 || ys.length < 4) continue;
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = Math.abs(maxX - minX);
    const length = Math.abs(maxY - minY);
    if (width > 0 && length > 0) {
      parts.push({ length, width, height: defaultHeight, quantity: 1 });
    }
  }
  // Merge identical rectangles
  const merged: Record<string, NestPart> = {};
  for (const p of parts) {
    const key = `${Math.round(p.length)}x${Math.round(p.width)}x${Math.round(p.height)}`;
    if (!merged[key]) merged[key] = { ...p };
    else merged[key].quantity += p.quantity;
  }
  return Object.values(merged);
}

export function parseJsonParts(jsonText: string): NestPart[] {
  const data = JSON.parse(jsonText);
  if (!Array.isArray(data)) throw new Error("JSON deve ser um array de peças");
  return data.map((it: any) => ({
    length: Number(it.length),
    width: Number(it.width),
    height: Number(it.height || 50),
    quantity: Number(it.quantity || 1),
    foamTypeId: it.foamTypeId,
    label: it.label,
  })).filter((p: NestPart) => p.length > 0 && p.width > 0 && p.quantity > 0);
}
