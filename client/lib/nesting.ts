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

export type PlacedPart = NestPart & {
  x: number;
  y: number;
  sheetIndex: number;
};

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
  expanded.sort(
    (a, b) => Math.max(b.length, b.width) - Math.max(a.length, a.width),
  );

  const placements: PlacedPart[] = [];
  const areaSheet =
    (sheet.length - 2 * sheet.margin) * (sheet.width - 2 * sheet.margin);
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
    if (
      cursorX + w > sheet.width - sheet.margin ||
      cursorY + h > sheet.length - sheet.margin
    ) {
      nextSheet();
    }

    placements.push({ ...item, x: cursorX, y: cursorY, sheetIndex });
    usedAreaTotal += item.length * item.width;
    cursorX += w;
    rowHeight = Math.max(rowHeight, h);
  }

  const sheetsUsed = sheetIndex + 1;
  const utilization = Math.min(
    1,
    usedAreaTotal / Math.max(1, sheetsUsed * areaSheet),
  );
  return { placements, sheetsUsed, utilization };
}

// Minimal DXF rectangle extractor over entity blocks. Accepts open polylines if first==last or 4+ vertices.
export function parseDxfRectangles(
  dxfContent: string,
  defaultHeight = 50,
): NestPart[] {
  const parts: NestPart[] = [];
  const content = String(dxfContent);

  // Helper to extract entity blocks by type until next entity (0 <type>)
  const extractBlocks = (type: string) =>
    Array.from(
      content.matchAll(
        new RegExp(`\n\\s*0\n\\s*${type}[\\s\\S]*?(?=\n\\s*0\n\\s*\\w+)`, "gi"),
      ),
    ).map((m) => m[0]);

  const lwBlocks = extractBlocks("LWPOLYLINE");
  const plBlocks = Array.from(
    content.matchAll(/\n\s*0\n\s*POLYLINE[\s\S]*?\n\s*0\n\s*SEQEND/gi),
  ).map((m) => m[0]);

  const parseBlock = (blk: string) => {
    const xs = Array.from(blk.matchAll(/\n\s*10\n\s*([\-\d\.]+)/g)).map((m) =>
      Number(m[1]),
    );
    const ys = Array.from(blk.matchAll(/\n\s*20\n\s*([\-\d\.]+)/g)).map((m) =>
      Number(m[1]),
    );
    if (xs.length < 4 || ys.length < 4) return;

    // Closed flag or repeated first/last
    const flagMatch = /\n\s*70\n\s*(\d+)/.exec(blk);
    const isClosedFlag = flagMatch ? (Number(flagMatch[1]) & 1) === 1 : false;
    const isClosedCoords =
      xs[0] === xs[xs.length - 1] && ys[0] === ys[ys.length - 1];
    if (!isClosedFlag && !isClosedCoords && xs.length !== 4) return;

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = Math.abs(maxX - minX);
    const length = Math.abs(maxY - minY);
    if (width > 0 && length > 0) {
      parts.push({ length, width, height: defaultHeight, quantity: 1 });
    }
  };

  lwBlocks.forEach(parseBlock);
  plBlocks.forEach(parseBlock);

  // If none found via polylines, try to compose rectangles from LINE entities
  if (parts.length === 0) {
    const lineBlocks = Array.from(
      content.matchAll(/\n\s*0\n\s*LINE[\s\S]*?(?=\n\s*0\n\s*\w+)/gi),
    ).map((m) => m[0]);

    type HLine = { y: number; x1: number; x2: number };
    type VLine = { x: number; y1: number; y2: number };
    const H: HLine[] = [];
    const V: VLine[] = [];

    const val = (blk: string, code: number) => {
      const m = new RegExp(`\\n\\s*${code}\\n\\s*([\\-\\d\\.]+)`, "g").exec(blk);
      return m ? Number(m[1]) : NaN;
    };
    const pushLine = (blk: string) => {
      const x1 = val(blk, 10);
      const y1 = val(blk, 20);
      const x2 = val(blk, 11);
      const y2 = val(blk, 21);
      if ([x1, y1, x2, y2].some((n) => !isFinite(n))) return;
      const eps = 1e-6;
      if (Math.abs(y1 - y2) < eps && Math.abs(x1 - x2) > eps) {
        const xa = Math.min(x1, x2);
        const xb = Math.max(x1, x2);
        H.push({ y: y1, x1: xa, x2: xb });
      } else if (Math.abs(x1 - x2) < eps && Math.abs(y1 - y2) > eps) {
        const ya = Math.min(y1, y2);
        const yb = Math.max(y1, y2);
        V.push({ x: x1, y1: ya, y2: yb });
      }
    };

    lineBlocks.forEach(pushLine);

    // Normalize with rounding to reduce floating noise
    const round = (n: number) => Math.round(n * 1000) / 1000;
    const Hn = H.map((l) => ({ y: round(l.y), x1: round(l.x1), x2: round(l.x2) }))
      // merge duplicates
      .filter((ln, idx, arr) => idx === arr.findIndex((t) => t.y === ln.y && t.x1 === ln.x1 && t.x2 === ln.x2));
    const Vn = V.map((l) => ({ x: round(l.x), y1: round(l.y1), y2: round(l.y2) }))
      .filter((ln, idx, arr) => idx === arr.findIndex((t) => t.x === ln.x && t.y1 === ln.y1 && t.y2 === ln.y2));

    // Index verticals for quick lookup
    const vIndex = new Map<string, boolean>();
    const vk = (x: number, y1: number, y2: number) => `${x}|${y1}|${y2}`;
    Vn.forEach((l) => vIndex.set(vk(l.x, l.y1, l.y2), true));

    // Find pairs of horizontal lines with same x-span and check verticals on the ends
    for (let i = 0; i < Hn.length; i++) {
      for (let j = i + 1; j < Hn.length; j++) {
        const a = Hn[i];
        const b = Hn[j];
        if (a.x1 !== b.x1 || a.x2 !== b.x2) continue;
        if (a.y === b.y) continue;
        const y1 = Math.min(a.y, b.y);
        const y2 = Math.max(a.y, b.y);
        const hasLeft = vIndex.get(vk(a.x1, y1, y2));
        const hasRight = vIndex.get(vk(a.x2, y1, y2));
        if (hasLeft && hasRight) {
          const width = Math.abs(a.x2 - a.x1);
          const length = Math.abs(y2 - y1);
          if (width > 0 && length > 0) {
            parts.push({ length, width, height: defaultHeight, quantity: 1 });
          }
        }
      }
    }
  }

  // Merge identical rectangles
  const merged: Record<string, NestPart> = {};
  for (const p of parts) {
    const key = `${Math.round(p.length)}x${Math.round(p.width)}x${Math.round(
      p.height,
    )}`;
    if (!merged[key]) merged[key] = { ...p };
    else merged[key].quantity += p.quantity;
  }
  return Object.values(merged);
}


export function parseJsonParts(jsonText: string): NestPart[] {
  const data = JSON.parse(jsonText);
  if (!Array.isArray(data)) throw new Error("JSON deve ser um array de peças");
  return data
    .map((it: any) => ({
      length: Number(it.length),
      width: Number(it.width),
      height: Number(it.height || 50),
      quantity: Number(it.quantity || 1),
      foamTypeId: it.foamTypeId,
      label: it.label,
    }))
    .filter((p: NestPart) => p.length > 0 && p.width > 0 && p.quantity > 0);
}
