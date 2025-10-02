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

export type DxfDrawing = {
  paths: Array<Array<[number, number]>>;
  bbox: { minX: number; minY: number; maxX: number; maxY: number } | null;
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

    // Validação: verifica se a peça realmente cabe antes de colocar
    if (
      cursorX + item.width + sheet.kerf <= sheet.width - sheet.margin &&
      cursorY + item.length + sheet.kerf <= sheet.length - sheet.margin
    ) {
      placements.push({ ...item, x: cursorX, y: cursorY, sheetIndex });
      usedAreaTotal += item.length * item.width;
      cursorX += w;
      rowHeight = Math.max(rowHeight, h);
    } else {
      // Não cabe: força novo painel
      nextSheet();
      if (
        item.width + sheet.kerf <= sheet.width - 2 * sheet.margin &&
        item.length + sheet.kerf <= sheet.length - 2 * sheet.margin
      ) {
        placements.push({ ...item, x: cursorX, y: cursorY, sheetIndex });
        usedAreaTotal += item.length * item.width;
        cursorX += w;
        rowHeight = Math.max(rowHeight, h);
      } else {
        console.error(
          `[Nesting] Peça ${item.length}×${item.width}mm não cabe no painel ${sheet.length}×${sheet.width}mm`,
        );
      }
    }
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
        new RegExp(
          `(?:^|\r?\n)\s*0\r?\n\s*${type}[\s\S]*?(?=(?:^|\r?\n)\s*0\r?\n\s*\w+)`,
          "gi",
        ),
      ),
    ).map((m) => m[0]);

  const lwBlocks = extractBlocks("LWPOLYLINE");
  const plBlocks = Array.from(
    content.matchAll(
      /(?:^|\r?\n)\s*0\r?\n\s*POLYLINE[\s\S]*?(?:^|\r?\n)\s*0\r?\n\s*SEQEND/gi,
    ),
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
      content.matchAll(
        /(?:^|\r?\n)\s*0\r?\n\s*LINE[\s\S]*?(?=(?:^|\r?\n)\s*0\r?\n\s*\w+)/gi,
      ),
    ).map((m) => m[0]);

    type HLine = { y: number; x1: number; x2: number };
    type VLine = { x: number; y1: number; y2: number };
    const H: HLine[] = [];
    const V: VLine[] = [];

    const val = (blk: string, code: number) => {
      const m = new RegExp(`\\n\\s*${code}\\n\\s*([\\-\\d\\.]+)`, "g").exec(
        blk,
      );
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
    const Hn = H.map((l) => ({
      y: round(l.y),
      x1: round(l.x1),
      x2: round(l.x2),
    }))
      // merge duplicates
      .filter(
        (ln, idx, arr) =>
          idx ===
          arr.findIndex(
            (t) => t.y === ln.y && t.x1 === ln.x1 && t.x2 === ln.x2,
          ),
      );
    const Vn = V.map((l) => ({
      x: round(l.x),
      y1: round(l.y1),
      y2: round(l.y2),
    })).filter(
      (ln, idx, arr) =>
        idx ===
        arr.findIndex((t) => t.x === ln.x && t.y1 === ln.y1 && t.y2 === ln.y2),
    );

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

  // If still none, try SPLINE (bounding box of control points)
  if (parts.length === 0) {
    const splineBlocks = Array.from(
      content.matchAll(
        /(?:^|\r?\n)\s*0\r?\n\s*SPLINE[\s\S]*?(?=(?:^|\r?\n)\s*0\r?\n\s*\w+)/gi,
      ),
    ).map((m) => m[0]);
    for (const blk of splineBlocks) {
      const xs = Array.from(blk.matchAll(/\n\s*10\n\s*([\-\d\.]+)/g)).map((m) =>
        Number(m[1]),
      );
      const ys = Array.from(blk.matchAll(/\n\s*20\n\s*([\-\d\.]+)/g)).map((m) =>
        Number(m[1]),
      );
      if (xs.length >= 2 && ys.length >= 2) {
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
    }
  }

  // If still none, try CIRCLE and ELLIPSE
  if (parts.length === 0) {
    const circleBlocks = Array.from(
      content.matchAll(
        /(?:^|\r?\n)\s*0\r?\n\s*CIRCLE[\s\S]*?(?=(?:^|\r?\n)\s*0\r?\n\s*\w+)/gi,
      ),
    ).map((m) => m[0]);
    for (const blk of circleBlocks) {
      const rMatch = /\n\s*40\n\s*([\-\d\.]+)/.exec(blk);
      if (!rMatch) continue;
      const r = Number(rMatch[1]);
      if (!isFinite(r) || r <= 0) continue;
      const size = 2 * r;
      parts.push({
        length: size,
        width: size,
        height: defaultHeight,
        quantity: 1,
      });
    }

    const ellipseBlocks = Array.from(
      content.matchAll(
        /(?:^|\r?\n)\s*0\r?\n\s*ELLIPSE[\s\S]*?(?=(?:^|\r?\n)\s*0\r?\n\s*\w+)/gi,
      ),
    ).map((m) => m[0]);
    for (const blk of ellipseBlocks) {
      const mx = /\n\s*11\n\s*([\-\d\.]+)/.exec(blk);
      const my = /\n\s*21\n\s*([\-\d\.]+)/.exec(blk);
      const ratioMatch = /\n\s*40\n\s*([\-\d\.]+)/.exec(blk);
      const mxv = mx ? Number(mx[1]) : NaN;
      const myv = my ? Number(my[1]) : NaN;
      const ratio = ratioMatch ? Number(ratioMatch[1]) : NaN;
      if (!isFinite(mxv) || !isFinite(myv) || !isFinite(ratio) || ratio <= 0)
        continue;
      const major = 2 * Math.sqrt(mxv * mxv + myv * myv);
      const minor = major * ratio;
      const width = Math.max(major, minor);
      const length = Math.min(major, minor);
      if (width > 0 && length > 0) {
        parts.push({ length, width, height: defaultHeight, quantity: 1 });
      }
    }
  }

  // If still none, try BLOCK/INSERT: compute block bounding boxes and count inserts
  if (parts.length === 0) {
    const blockChunks = Array.from(
      content.matchAll(/\n\s*0\n\s*BLOCK[\s\S]*?\n\s*0\n\s*ENDBLK/gi),
    ).map((m) => m[0]);
    const blockDims = new Map<string, { length: number; width: number }>();

    for (const blk of blockChunks) {
      const nameMatch = /\n\s*2\n\s*([^\n\r]+)/.exec(blk);
      const name = nameMatch ? nameMatch[1].trim() : "";
      if (!name) continue;

      let xs = Array.from(blk.matchAll(/\n\s*10\n\s*([\-\d\.]+)/g)).map((m) =>
        Number(m[1]),
      );
      let ys = Array.from(blk.matchAll(/\n\s*20\n\s*([\-\d\.]+)/g)).map((m) =>
        Number(m[1]),
      );
      // If no vertices, try circle/ellipse sizes as extents
      if (xs.length < 2 || ys.length < 2) {
        const circleRs = Array.from(
          blk.matchAll(/\n\s*40\n\s*([\-\d\.]+)/g),
        ).map((m) => Number(m[1]));
        if (circleRs.length > 0) {
          const size = 2 * Math.max(...circleRs);
          blockDims.set(name, { length: size, width: size });
          continue;
        }
      }
      if (xs.length >= 2 && ys.length >= 2) {
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const width = Math.abs(maxX - minX);
        const length = Math.abs(maxY - minY);
        if (width > 0 && length > 0) blockDims.set(name, { length, width });
      }
    }

    // Read INSERT occurrences and create parts accordingly
    if (blockDims.size > 0) {
      const inserts = Array.from(
        content.matchAll(
          /(?:^|\r?\n)\s*0\r?\n\s*INSERT[\s\S]*?(?=(?:^|\r?\n)\s*0\r?\n\s*\w+)/gi,
        ),
      ).map((m) => m[0]);
      for (const ins of inserts) {
        const nameMatch = /\n\s*2\n\s*([^\n\r]+)/.exec(ins);
        const name = nameMatch ? nameMatch[1].trim() : "";
        if (!name) continue;
        const base = blockDims.get(name);
        if (!base) continue;
        const sxMatch = /\n\s*41\n\s*([\-\d\.]+)/.exec(ins);
        const syMatch = /\n\s*42\n\s*([\-\d\.]+)/.exec(ins);
        const angMatch = /\n\s*50\n\s*([\-\d\.]+)/.exec(ins);
        const sx = sxMatch ? Number(sxMatch[1]) : 1;
        const sy = syMatch ? Number(syMatch[1]) : 1;
        const ang = angMatch ? Number(angMatch[1]) : 0;
        let w = base.width * Math.abs(sx);
        let l = base.length * Math.abs(sy);
        const rot = ((ang % 360) + 360) % 360;
        if (Math.abs(rot - 90) < 1e-3 || Math.abs(rot - 270) < 1e-3) {
          const tmp = w;
          w = l;
          l = tmp;
        }
        if (w > 0 && l > 0)
          parts.push({
            length: l,
            width: w,
            height: defaultHeight,
            quantity: 1,
          });
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

// Extract generic vector paths from DXF for visualization (no dependencies).
export function parseDxfPaths(dxfContent: string): DxfDrawing {
  const content = String(dxfContent);
  const paths: Array<Array<[number, number]>> = [];

  // Helper to extract blocks by type
  const blocks = (type: string, regex?: RegExp) =>
    Array.from(
      content.matchAll(
        regex ||
          new RegExp(
            `(?:^|\r?\n)\s*0\r?\n\s*${type}[\s\S]*?(?=(?:^|\r?\n)\s*0\r?\n\s*\w+)`,
            "gi",
          ),
      ),
    ).map((m) => m[0]);

  // LWPOLYLINE
  for (const blk of blocks("LWPOLYLINE")) {
    const xs = Array.from(blk.matchAll(/\n\s*10\n\s*([\-\d\.]+)/g)).map((m) =>
      Number(m[1]),
    );
    const ys = Array.from(blk.matchAll(/\n\s*20\n\s*([\-\d\.]+)/g)).map((m) =>
      Number(m[1]),
    );
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < Math.min(xs.length, ys.length); i++)
      pts.push([xs[i], ys[i]]);
    if (pts.length >= 2) paths.push(pts);
  }

  // POLYLINE + VERTEX ... SEQEND
  for (const blk of blocks(
    "POLYLINE",
    /\n\s*0\n\s*POLYLINE[\s\S]*?\n\s*0\n\s*SEQEND/gi,
  )) {
    const verts = Array.from(
      blk.matchAll(/\n\s*0\n\s*VERTEX[\s\S]*?(?=\n\s*0\n\s*\w+)/gi),
    ).map((m) => m[0]);
    const pts: Array<[number, number]> = [];
    for (const v of verts) {
      const x = /\n\s*10\n\s*([\-\d\.]+)/.exec(v);
      const y = /\n\s*20\n\s*([\-\d\.]+)/.exec(v);
      if (x && y) pts.push([Number(x[1]), Number(y[1])]);
    }
    if (pts.length >= 2) paths.push(pts);
  }

  // LINE
  for (const blk of blocks("LINE")) {
    const x1 = /\n\s*10\n\s*([\-\d\.]+)/.exec(blk);
    const y1 = /\n\s*20\n\s*([\-\d\.]+)/.exec(blk);
    const x2 = /\n\s*11\n\s*([\-\d\.]+)/.exec(blk);
    const y2 = /\n\s*21\n\s*([\-\d\.]+)/.exec(blk);
    if (x1 && y1 && x2 && y2)
      paths.push([
        [Number(x1[1]), Number(y1[1])],
        [Number(x2[1]), Number(y2[1])],
      ]);
  }

  // CIRCLE (approximate with 32 segments)
  for (const blk of blocks("CIRCLE")) {
    const cx = /\n\s*10\n\s*([\-\d\.]+)/.exec(blk);
    const cy = /\n\s*20\n\s*([\-\d\.]+)/.exec(blk);
    const r = /\n\s*40\n\s*([\-\d\.]+)/.exec(blk);
    if (cx && cy && r) {
      const cxt = Number(cx[1]);
      const cyt = Number(cy[1]);
      const rt = Number(r[1]);
      const segs: Array<[number, number]> = [];
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        segs.push([cxt + rt * Math.cos(a), cyt + rt * Math.sin(a)]);
      }
      segs.push(segs[0]);
      paths.push(segs);
    }
  }

  // ELLIPSE (approximate)
  for (const blk of blocks("ELLIPSE")) {
    const cx = /\n\s*10\n\s*([\-\d\.]+)/.exec(blk);
    const cy = /\n\s*20\n\s*([\-\d\.]+)/.exec(blk);
    const mx = /\n\s*11\n\s*([\-\d\.]+)/.exec(blk);
    const my = /\n\s*21\n\s*([\-\d\.]+)/.exec(blk);
    const ratio = /\n\s*40\n\s*([\-\d\.]+)/.exec(blk);
    if (cx && cy && mx && my && ratio) {
      const cxt = Number(cx[1]);
      const cyt = Number(cy[1]);
      const mxv = Number(mx[1]);
      const myv = Number(my[1]);
      const r = Number(ratio[1]);
      const aMajor = Math.sqrt(mxv * mxv + myv * myv);
      const ang = Math.atan2(myv, mxv);
      const aMinor = aMajor * Math.abs(r);
      const segs: Array<[number, number]> = [];
      for (let i = 0; i < 48; i++) {
        const t = (i / 48) * Math.PI * 2;
        const px = aMajor * Math.cos(t);
        const py = aMinor * Math.sin(t);
        const rx = px * Math.cos(ang) - py * Math.sin(ang);
        const ry = px * Math.sin(ang) + py * Math.cos(ang);
        segs.push([cxt + rx, cyt + ry]);
      }
      segs.push(segs[0]);
      paths.push(segs);
    }
  }

  // Compute bbox
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of paths) {
    for (const [x, y] of p) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const bbox = paths.length ? { minX, minY, maxX, maxY } : null;
  return { paths, bbox };
}
