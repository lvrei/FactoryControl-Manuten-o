declare module 'dxf-parser' {
  export default class DxfParser {
    parseSync(dxfString: string): DxfData;
  }

  export interface DxfData {
    header: Record<string, any>;
    tables: Record<string, any>;
    blocks: Record<string, Block>;
    entities: Entity[];
  }

  export interface Block {
    type: string;
    name: string;
    name2?: string;
    position?: Point;
    entities: Entity[];
  }

  export interface Entity {
    type: string;
    layer?: string;
    handle?: string;
    [key: string]: any;
  }

  export interface Point {
    x: number;
    y: number;
    z?: number;
  }

  export interface Line extends Entity {
    type: 'LINE';
    vertices: [Point, Point];
  }

  export interface Polyline extends Entity {
    type: 'POLYLINE' | 'LWPOLYLINE';
    vertices: Point[];
    closed?: boolean;
  }

  export interface Circle extends Entity {
    type: 'CIRCLE';
    center: Point;
    radius: number;
  }

  export interface Arc extends Entity {
    type: 'ARC';
    center: Point;
    radius: number;
    startAngle: number;
    endAngle: number;
  }

  export interface Ellipse extends Entity {
    type: 'ELLIPSE';
    center: Point;
    majorAxisEndPoint: Point;
    axisRatio: number;
    startAngle?: number;
    endAngle?: number;
  }

  export interface Spline extends Entity {
    type: 'SPLINE';
    controlPoints: Point[];
    fitPoints?: Point[];
    degree?: number;
    closed?: boolean;
  }

  export interface Insert extends Entity {
    type: 'INSERT';
    name: string;
    position: Point;
    xScale?: number;
    yScale?: number;
    rotation?: number;
  }
}
