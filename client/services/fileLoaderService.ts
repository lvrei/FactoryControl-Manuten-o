import DxfParser from "dxf-parser";
import type { DxfData, Entity } from "dxf-parser";

export type Part = {
  length: number;
  width: number;
  height: number;
  quantity: number;
  label?: string;
  foamTypeId?: string;
};

export type DrawingPath = Array<[number, number]>;

export type LoadedDrawing = {
  parts: Part[];
  paths: DrawingPath[];
  bbox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null;
  format: "dxf" | "json" | "svg";
  metadata?: Record<string, any>;
};

export type FileLoaderOptions = {
  defaultHeight?: number;
  detectRectangles?: boolean;
  extractPaths?: boolean;
};

export class FileLoaderError extends Error {
  constructor(
    message: string,
    public code:
      | "UNSUPPORTED_FORMAT"
      | "PARSE_ERROR"
      | "BINARY_DXF"
      | "NO_DATA",
    public details?: any,
  ) {
    super(message);
    this.name = "FileLoaderError";
  }
}

class FileLoaderService {
  private dxfParser: DxfParser;

  constructor() {
    this.dxfParser = new DxfParser();
  }

  async loadFile(
    file: File,
    options: FileLoaderOptions = {},
  ): Promise<LoadedDrawing> {
    const {
      defaultHeight = 50,
      detectRectangles = true,
      extractPaths = true,
    } = options;

    const extension = file.name.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "dxf":
        return this.loadDxf(
          file,
          defaultHeight,
          detectRectangles,
          extractPaths,
        );
      case "json":
        return this.loadJson(file);
      default:
        throw new FileLoaderError(
          `Formato não suportado: .${extension}. Use DXF ou JSON.`,
          "UNSUPPORTED_FORMAT",
        );
    }
  }

  private async loadDxf(
    file: File,
    defaultHeight: number,
    detectRectangles: boolean,
    extractPaths: boolean,
  ): Promise<LoadedDrawing> {
    const text = await this.readFileAsText(file);

    if (!/SECTION/i.test(text)) {
      throw new FileLoaderError(
        "Este DXF está em formato binário. Exporte como DXF ASCII (R12/R2000) e tente novamente.",
        "BINARY_DXF",
      );
    }

    let dxfData: DxfData;
    try {
      dxfData = this.dxfParser.parseSync(text);
    } catch (error: any) {
      throw new FileLoaderError(
        `Erro ao parsear DXF: ${error.message}`,
        "PARSE_ERROR",
        error,
      );
    }

    const parts: Part[] = detectRectangles
      ? this.extractPartsFromDxf(dxfData, defaultHeight)
      : [];
    const paths: DrawingPath[] = extractPaths
      ? this.extractPathsFromDxf(dxfData)
      : [];
    const bbox = this.calculateBoundingBox(paths);

    return {
      parts,
      paths,
      bbox,
      format: "dxf",
      metadata: {
        header: dxfData.header,
        layerCount: Object.keys(dxfData.tables?.layer?.layers || {}).length,
        entityCount: dxfData.entities?.length || 0,
      },
    };
  }

  private extractPartsFromDxf(dxfData: DxfData, defaultHeight: number): Part[] {
    const parts: Part[] = [];
    const entities = dxfData.entities || [];

    for (const entity of entities) {
      const part = this.entityToPart(entity, defaultHeight);
      if (part) {
        parts.push(part);
      }
    }

    if (parts.length === 0 && dxfData.blocks) {
      for (const blockName in dxfData.blocks) {
        const block = dxfData.blocks[blockName];
        for (const entity of block.entities || []) {
          const part = this.entityToPart(entity, defaultHeight);
          if (part) {
            parts.push(part);
          }
        }
      }
    }

    return this.mergeDuplicateParts(parts);
  }

  private entityToPart(entity: Entity, defaultHeight: number): Part | null {
    try {
      switch (entity.type) {
        case "LWPOLYLINE":
        case "POLYLINE": {
          const vertices = (entity as any).vertices;
          if (!vertices || vertices.length < 3) return null;

          const xs = vertices.map((v: any) => v.x);
          const ys = vertices.map((v: any) => v.y);
          const width = Math.max(...xs) - Math.min(...xs);
          const length = Math.max(...ys) - Math.min(...ys);

          if (width > 0 && length > 0) {
            return {
              length: Math.round(length),
              width: Math.round(width),
              height: defaultHeight,
              quantity: 1,
            };
          }
          return null;
        }

        case "LINE": {
          const line = entity as any;
          if (!line.vertices || line.vertices.length !== 2) return null;
          return null;
        }

        case "CIRCLE": {
          const circle = entity as any;
          const diameter = circle.radius * 2;
          return {
            length: Math.round(diameter),
            width: Math.round(diameter),
            height: defaultHeight,
            quantity: 1,
            label: "Círculo",
          };
        }

        case "ELLIPSE": {
          const ellipse = entity as any;
          const majorAxis = ellipse.majorAxisEndPoint;
          const majorLength =
            Math.sqrt(majorAxis.x * majorAxis.x + majorAxis.y * majorAxis.y) *
            2;
          const minorLength = majorLength * ellipse.axisRatio;

          return {
            length: Math.round(Math.max(majorLength, minorLength)),
            width: Math.round(Math.min(majorLength, minorLength)),
            height: defaultHeight,
            quantity: 1,
            label: "Elipse",
          };
        }

        case "INSERT": {
          const insert = entity as any;
          const block = (this.dxfParser as any).dxfData?.blocks?.[insert.name];
          if (!block) return null;

          const blockBbox = this.calculateBlockBoundingBox(block);
          if (!blockBbox) return null;

          const width =
            (blockBbox.maxX - blockBbox.minX) * Math.abs(insert.xScale || 1);
          const length =
            (blockBbox.maxY - blockBbox.minY) * Math.abs(insert.yScale || 1);

          if (width > 0 && length > 0) {
            return {
              length: Math.round(length),
              width: Math.round(width),
              height: defaultHeight,
              quantity: 1,
              label: insert.name,
            };
          }
          return null;
        }

        default:
          return null;
      }
    } catch (error) {
      console.warn("Erro ao processar entidade:", entity.type, error);
      return null;
    }
  }

  private extractPathsFromDxf(dxfData: DxfData): DrawingPath[] {
    const paths: DrawingPath[] = [];
    const entities = dxfData.entities || [];

    for (const entity of entities) {
      const path = this.entityToPath(entity);
      if (path && path.length > 0) {
        paths.push(path);
      }
    }

    if (paths.length === 0 && dxfData.blocks) {
      for (const blockName in dxfData.blocks) {
        const block = dxfData.blocks[blockName];
        for (const entity of block.entities || []) {
          const path = this.entityToPath(entity);
          if (path && path.length > 0) {
            paths.push(path);
          }
        }
      }
    }

    return paths;
  }

  private entityToPath(entity: Entity): DrawingPath | null {
    try {
      switch (entity.type) {
        case "LWPOLYLINE":
        case "POLYLINE": {
          const vertices = (entity as any).vertices;
          if (!vertices || vertices.length < 2) return null;
          return vertices.map((v: any) => [v.x, v.y] as [number, number]);
        }

        case "LINE": {
          const line = entity as any;
          if (!line.vertices || line.vertices.length !== 2) return null;
          return line.vertices.map((v: any) => [v.x, v.y] as [number, number]);
        }

        case "CIRCLE": {
          const circle = entity as any;
          const segments = 64;
          const path: DrawingPath = [];
          for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            path.push([
              circle.center.x + circle.radius * Math.cos(angle),
              circle.center.y + circle.radius * Math.sin(angle),
            ]);
          }
          return path;
        }

        case "ARC": {
          const arc = entity as any;
          const segments = 32;
          const path: DrawingPath = [];
          const startAngle = (arc.startAngle * Math.PI) / 180;
          const endAngle = (arc.endAngle * Math.PI) / 180;
          const angleRange =
            endAngle > startAngle
              ? endAngle - startAngle
              : 2 * Math.PI - (startAngle - endAngle);

          for (let i = 0; i <= segments; i++) {
            const angle = startAngle + (i / segments) * angleRange;
            path.push([
              arc.center.x + arc.radius * Math.cos(angle),
              arc.center.y + arc.radius * Math.sin(angle),
            ]);
          }
          return path;
        }

        case "ELLIPSE": {
          const ellipse = entity as any;
          const segments = 64;
          const path: DrawingPath = [];
          const majorAxis = ellipse.majorAxisEndPoint;
          const angle = Math.atan2(majorAxis.y, majorAxis.x);
          const majorLength = Math.sqrt(
            majorAxis.x * majorAxis.x + majorAxis.y * majorAxis.y,
          );
          const minorLength = majorLength * ellipse.axisRatio;

          for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 2;
            const x = majorLength * Math.cos(t);
            const y = minorLength * Math.sin(t);
            const rotatedX = x * Math.cos(angle) - y * Math.sin(angle);
            const rotatedY = x * Math.sin(angle) + y * Math.cos(angle);
            path.push([
              ellipse.center.x + rotatedX,
              ellipse.center.y + rotatedY,
            ]);
          }
          return path;
        }

        case "SPLINE": {
          const spline = entity as any;
          const points = spline.controlPoints || spline.fitPoints;
          if (!points || points.length < 2) return null;
          return points.map((p: any) => [p.x, p.y] as [number, number]);
        }

        default:
          return null;
      }
    } catch (error) {
      console.warn("Erro ao processar path da entidade:", entity.type, error);
      return null;
    }
  }

  private async loadJson(file: File): Promise<LoadedDrawing> {
    const text = await this.readFileAsText(file);

    let data: any;
    try {
      data = JSON.parse(text);
    } catch (error: any) {
      throw new FileLoaderError(
        `Erro ao parsear JSON: ${error.message}`,
        "PARSE_ERROR",
        error,
      );
    }

    if (!Array.isArray(data)) {
      throw new FileLoaderError(
        "JSON deve ser um array de peças",
        "PARSE_ERROR",
      );
    }

    const parts: Part[] = data
      .map((item: any) => ({
        length: Number(item.length) || 0,
        width: Number(item.width) || 0,
        height: Number(item.height) || 50,
        quantity: Number(item.quantity) || 1,
        label: item.label,
        foamTypeId: item.foamTypeId,
      }))
      .filter((p: Part) => p.length > 0 && p.width > 0 && p.quantity > 0);

    if (parts.length === 0) {
      throw new FileLoaderError(
        "Nenhuma peça válida encontrada no JSON",
        "NO_DATA",
      );
    }

    return {
      parts,
      paths: [],
      bbox: null,
      format: "json",
    };
  }

  private mergeDuplicateParts(parts: Part[]): Part[] {
    const merged: Record<string, Part> = {};

    for (const part of parts) {
      const key = `${Math.round(part.length)}x${Math.round(part.width)}x${Math.round(part.height)}`;
      if (!merged[key]) {
        merged[key] = { ...part };
      } else {
        merged[key].quantity += part.quantity;
      }
    }

    return Object.values(merged);
  }

  private calculateBoundingBox(
    paths: DrawingPath[],
  ): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (paths.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const path of paths) {
      for (const [x, y] of path) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    return { minX, minY, maxX, maxY };
  }

  private calculateBlockBoundingBox(block: any): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null {
    const paths: DrawingPath[] = [];

    for (const entity of block.entities || []) {
      const path = this.entityToPath(entity);
      if (path) paths.push(path);
    }

    return this.calculateBoundingBox(paths);
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Erro ao ler ficheiro"));
      reader.readAsText(file);
    });
  }
}

export const fileLoaderService = new FileLoaderService();
