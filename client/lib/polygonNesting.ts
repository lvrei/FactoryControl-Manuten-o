export type Point = [number, number];
export type Polygon = Point[];

export type PolygonPart = {
  polygon: Polygon;
  quantity: number;
  height: number;
  foamTypeId?: string;
  label?: string;
};

export type PlacedPolygonPart = PolygonPart & {
  x: number;
  y: number;
  rotation: number; // graus
  sheetIndex: number;
};

export type PolygonSheet = {
  length: number;
  width: number;
  kerf: number;
  margin: number;
};

export type PolygonNestResult = {
  placements: PlacedPolygonPart[];
  sheetsUsed: number;
  utilization: number;
  totalArea: number;
  usedArea: number;
};

// Calcula área de um polígono usando fórmula Shoelace
export function polygonArea(polygon: Polygon): number {
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i][0] * polygon[j][1];
    area -= polygon[j][0] * polygon[i][1];
  }
  return Math.abs(area) / 2;
}

// Calcula bounding box de um polígono
export function polygonBBox(polygon: Polygon): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (polygon.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// Normaliza polígono para origem (0,0)
export function normalizePolygon(polygon: Polygon): Polygon {
  const bbox = polygonBBox(polygon);
  return polygon.map(([x, y]) => [x - bbox.minX, y - bbox.minY]);
}

// Translada polígono
export function translatePolygon(
  polygon: Polygon,
  dx: number,
  dy: number
): Polygon {
  return polygon.map(([x, y]) => [x + dx, y + dy]);
}

// Roda polígono em torno de um ponto
export function rotatePolygon(
  polygon: Polygon,
  angleDeg: number,
  centerX = 0,
  centerY = 0
): Polygon {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return polygon.map(([x, y]) => {
    const dx = x - centerX;
    const dy = y - centerY;
    return [
      centerX + dx * cos - dy * sin,
      centerY + dx * sin + dy * cos,
    ] as Point;
  });
}

// Verifica se polígono está completamente dentro do retângulo (sheet)
export function isPolygonInSheet(
  polygon: Polygon,
  sheet: PolygonSheet
): boolean {
  const bbox = polygonBBox(polygon);
  return (
    bbox.minX >= sheet.margin &&
    bbox.minY >= sheet.margin &&
    bbox.maxX <= sheet.width - sheet.margin &&
    bbox.maxY <= sheet.length - sheet.margin
  );
}

// Verifica interseção simples entre bounding boxes (rápido)
export function bboxOverlap(
  bbox1: ReturnType<typeof polygonBBox>,
  bbox2: ReturnType<typeof polygonBBox>,
  kerf: number
): boolean {
  return !(
    bbox1.maxX + kerf < bbox2.minX ||
    bbox2.maxX + kerf < bbox1.minX ||
    bbox1.maxY + kerf < bbox2.minY ||
    bbox2.maxY + kerf < bbox1.minY
  );
}

// Verifica se dois polígonos se sobrepõem (simplificado - usa bounding boxes com margem)
export function polygonsOverlap(
  poly1: Polygon,
  poly2: Polygon,
  kerf: number
): boolean {
  const bbox1 = polygonBBox(poly1);
  const bbox2 = polygonBBox(poly2);
  return bboxOverlap(bbox1, bbox2, kerf);
}

// Algoritmo de nesting simplificado para polígonos irregulares
// Usa estratégia gulosa: tenta posições em grade e coloca quando caber
export function packPolygons(
  parts: PolygonPart[],
  sheet: PolygonSheet
): PolygonNestResult {
  const placements: PlacedPolygonPart[] = [];
  let sheetIndex = 0;
  const gridStep = Math.max(10, sheet.kerf * 2); // passo da grade

  // Expande quantidades
  const expandedParts: PolygonPart[] = [];
  for (const part of parts) {
    const normalized = normalizePolygon(part.polygon);
    for (let i = 0; i < part.quantity; i++) {
      expandedParts.push({ ...part, polygon: normalized });
    }
  }

  // Ordena por área decrescente (maiores primeiro)
  expandedParts.sort((a, b) => polygonArea(b.polygon) - polygonArea(a.polygon));

  let totalSheetArea = 0;
  let usedArea = 0;

  const sheetPolygons = new Map<number, Polygon[]>();

  for (const part of expandedParts) {
    let placed = false;

    // Tenta rotações: 0°, 90°, 180°, 270°
    const rotations = [0, 90, 180, 270];

    for (const rotation of rotations) {
      if (placed) break;

      const rotated = rotatePolygon(part.polygon, rotation);
      const bbox = polygonBBox(rotated);

      // Tenta posições em grade no sheet atual
      for (
        let y = sheet.margin;
        y <= sheet.length - sheet.margin - bbox.height;
        y += gridStep
      ) {
        if (placed) break;

        for (
          let x = sheet.margin;
          x <= sheet.width - sheet.margin - bbox.width;
          x += gridStep
        ) {
          const candidate = translatePolygon(rotated, x, y);

          // Verifica se cabe no sheet
          if (!isPolygonInSheet(candidate, sheet)) continue;

          // Verifica colisão com polígonos já colocados neste sheet
          const existing = sheetPolygons.get(sheetIndex) || [];
          let hasCollision = false;

          for (const existingPoly of existing) {
            if (polygonsOverlap(candidate, existingPoly, sheet.kerf)) {
              hasCollision = true;
              break;
            }
          }

          if (!hasCollision) {
            placements.push({
              ...part,
              polygon: candidate,
              x,
              y,
              rotation,
              sheetIndex,
            });

            if (!sheetPolygons.has(sheetIndex)) {
              sheetPolygons.set(sheetIndex, []);
              totalSheetArea +=
                (sheet.width - 2 * sheet.margin) *
                (sheet.length - 2 * sheet.margin);
            }
            sheetPolygons.get(sheetIndex)!.push(candidate);
            usedArea += polygonArea(part.polygon);

            placed = true;
            break;
          }
        }
      }
    }

    // Se não coube, vai para próximo sheet
    if (!placed) {
      sheetIndex++;
      const rotated = part.polygon;
      const bbox = polygonBBox(rotated);
      const x = sheet.margin;
      const y = sheet.margin;
      const candidate = translatePolygon(rotated, x, y);

      placements.push({
        ...part,
        polygon: candidate,
        x,
        y,
        rotation: 0,
        sheetIndex,
      });

      sheetPolygons.set(sheetIndex, [candidate]);
      totalSheetArea +=
        (sheet.width - 2 * sheet.margin) *
        (sheet.length - 2 * sheet.margin);
      usedArea += polygonArea(part.polygon);
    }
  }

  const sheetsUsed = sheetIndex + 1;
  const utilization = totalSheetArea > 0 ? usedArea / totalSheetArea : 0;

  console.log(`[Polygon Nesting] Colocados ${placements.length} polígonos em ${sheetsUsed} painéis`);
  console.log(`[Polygon Nesting] Utilização: ${(utilization * 100).toFixed(1)}%`);

  return {
    placements,
    sheetsUsed,
    utilization,
    totalArea: totalSheetArea,
    usedArea,
  };
}

// Converte path DXF para PolygonPart
export function pathToPolygonPart(
  path: Point[],
  height: number,
  quantity: number = 1,
  foamTypeId?: string,
  label?: string
): PolygonPart {
  return {
    polygon: path,
    quantity,
    height,
    foamTypeId,
    label,
  };
}
