import { useState } from "react";
import { ChevronDown, ChevronUp, Bug, AlertCircle, CheckCircle } from "lucide-react";
import type { LoadedDrawing } from "@/services/fileLoaderService";

export type DxfDebugPanelProps = {
  drawing: LoadedDrawing | null;
};

export default function DxfDebugPanel({ drawing }: DxfDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!drawing || drawing.format !== 'dxf') return null;

  const metadata = drawing.metadata || {};
  const hasIssues = drawing.parts.length === 0 || drawing.paths.length === 0;

  return (
    <div className="border rounded bg-muted/10">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm">
          <Bug className="h-4 w-4" />
          <span className="font-medium">Informações de Debug</span>
          {hasIssues && (
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="p-3 border-t text-xs space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-background rounded">
              <div className="text-muted-foreground mb-1">Formato</div>
              <div className="font-mono font-semibold">{drawing.format.toUpperCase()}</div>
            </div>
            <div className="p-2 bg-background rounded">
              <div className="text-muted-foreground mb-1">Entidades</div>
              <div className="font-mono font-semibold">{metadata.entityCount || 0}</div>
            </div>
            <div className="p-2 bg-background rounded">
              <div className="text-muted-foreground mb-1">Layers</div>
              <div className="font-mono font-semibold">{metadata.layerCount || 0}</div>
            </div>
            <div className="p-2 bg-background rounded">
              <div className="text-muted-foreground mb-1">Paths Extraídos</div>
              <div className="font-mono font-semibold">{drawing.paths.length}</div>
            </div>
          </div>

          <div className="p-2 bg-background rounded space-y-2">
            <div className="flex items-center gap-2">
              {drawing.parts.length > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
              <span className="font-medium">
                Peças Detetadas: {drawing.parts.length}
              </span>
            </div>
            
            {drawing.parts.length > 0 && (
              <div className="ml-6 space-y-1 max-h-40 overflow-auto">
                {drawing.parts.map((part, idx) => (
                  <div key={idx} className="font-mono text-muted-foreground">
                    #{idx + 1}: {Math.round(part.length)}×{Math.round(part.width)}×
                    {Math.round(part.height)}mm (qty: {part.quantity})
                    {part.label && ` - ${part.label}`}
                  </div>
                ))}
              </div>
            )}
          </div>

          {drawing.bbox && (
            <div className="p-2 bg-background rounded">
              <div className="font-medium mb-1">Bounding Box</div>
              <div className="font-mono text-muted-foreground space-y-1">
                <div>X: [{drawing.bbox.minX.toFixed(2)}, {drawing.bbox.maxX.toFixed(2)}]</div>
                <div>Y: [{drawing.bbox.minY.toFixed(2)}, {drawing.bbox.maxY.toFixed(2)}]</div>
                <div>
                  Tamanho: {(drawing.bbox.maxX - drawing.bbox.minX).toFixed(2)} × {(drawing.bbox.maxY - drawing.bbox.minY).toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {hasIssues && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              {drawing.parts.length === 0 && drawing.paths.length === 0 && (
                <span>Nenhuma geometria foi detetada. Verifique se o DXF contém entidades válidas.</span>
              )}
              {drawing.parts.length === 0 && drawing.paths.length > 0 && (
                <span>Geometria visualizada mas sem retângulos detetados. Use seleção manual ou forneça JSON.</span>
              )}
            </div>
          )}

          <div className="pt-2 border-t text-muted-foreground">
            <div className="font-medium mb-1">Console do Navegador</div>
            <div>
              Abra a consola do navegador (F12) para ver logs detalhados do processamento DXF.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
