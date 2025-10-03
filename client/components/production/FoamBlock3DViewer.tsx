import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Box,
  Text,
  Grid,
  PerspectiveCamera,
} from "@react-three/drei";
import { Suspense } from "react";
import * as THREE from "three";
import type { BlockNestingResult, PlacedPart } from "@/lib/foamBlockNesting";

type FoamBlock3DViewerProps = {
  result: BlockNestingResult;
  selectedBlockIndex?: number;
};

type ExtendedPlacedPart = PlacedPart & {
  polygon?: [number, number][];
};

function Block3D({
  dimensions,
  position,
  color = "#f8f9fa",
  opacity = 0.2,
  wireframe = true,
}: {
  dimensions: [number, number, number];
  position: [number, number, number];
  color?: string;
  opacity?: number;
  wireframe?: boolean;
}) {
  return (
    <Box args={dimensions} position={position}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        wireframe={wireframe}
      />
    </Box>
  );
}

function PolygonPart3D({
  part,
  blockDimensions,
}: {
  part: ExtendedPlacedPart;
  blockDimensions: { length: number; width: number; height: number };
}) {
  const layerColors = [
    "#22c55e", // Verde
    "#3b82f6", // Azul
    "#ef4444", // Vermelho
    "#f59e0b", // Amarelo
    "#a855f7", // Roxo
    "#06b6d4", // Ciano
    "#ec4899", // Rosa
    "#f97316", // Laranja
  ];

  const layerIndex = Math.floor(part.z / 100) % layerColors.length;
  const color = layerColors[layerIndex];

  if (!part.polygon || part.polygon.length < 3) {
    // Fallback to box if no polygon data
    const x = part.x + part.length / 2 - blockDimensions.length / 2;

    // Usa Z diretamente da peça (já filtrado por bloco)
    const y = part.z + part.height / 2 - blockDimensions.height / 2;

    const z = -(part.y + part.width / 2 - blockDimensions.width / 2);

    return (
      <group>
        <Box args={[part.length, part.height, part.width]} position={[x, y, z]}>
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.85}
            roughness={0.3}
            metalness={0.1}
          />
        </Box>
        <Box args={[part.length, part.height, part.width]} position={[x, y, z]}>
          <meshBasicMaterial color="#1e293b" wireframe />
        </Box>
      </group>
    );
  }

  // Cria forma extrudida a partir do polígono
  const shape = new THREE.Shape();
  part.polygon.forEach(([x, y], i) => {
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  });
  shape.closePath();

  const extrudeSettings = {
    steps: 1,
    depth: part.height,
    bevelEnabled: false,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // Ajusta posição para centrar no bloco
  const posX = part.x - blockDimensions.length / 2;

  // Usa Z diretamente da peça (já filtrado por bloco)
  const posY = part.z + part.height / 2 - blockDimensions.height / 2;

  const posZ = -(part.y - blockDimensions.width / 2);

  return (
    <group position={[posX, posY, posZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.85}
          roughness={0.3}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#1e293b" wireframe />
      </mesh>
    </group>
  );
}

function Part3D({
  part,
  blockDimensions,
}: {
  part: ExtendedPlacedPart;
  blockDimensions: { length: number; width: number; height: number };
}) {
  // Converte coordenadas: SVG usa top-left, Three.js usa centro
  // Ajusta para que o bloco esteja centrado em (0,0,0)
  const x = part.x + part.length / 2 - blockDimensions.length / 2;

  // Usa Z diretamente da peça (já filtrado por bloco)
  const y = part.z + part.height / 2 - blockDimensions.height / 2;

  const z = -(part.y + part.width / 2 - blockDimensions.width / 2);

  const layerColors = [
    "#22c55e", // Verde
    "#3b82f6", // Azul
    "#ef4444", // Vermelho
    "#f59e0b", // Amarelo
    "#a855f7", // Roxo
    "#06b6d4", // Ciano
    "#ec4899", // Rosa
    "#f97316", // Laranja
  ];

  // Determina cor baseada na posição Z (camada)
  const zLayers = Array.from(new Set([part.z])).sort((a, b) => a - b);
  const layerIndex = Math.floor(part.z / 100) % layerColors.length;
  const color = layerColors[layerIndex];

  return (
    <group>
      <Box args={[part.length, part.height, part.width]} position={[x, y, z]}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.85}
          roughness={0.3}
          metalness={0.1}
        />
      </Box>
      {/* Bordas para melhor definição */}
      <Box args={[part.length, part.height, part.width]} position={[x, y, z]}>
        <meshBasicMaterial color="#1e293b" wireframe />
      </Box>
    </group>
  );
}

function Scene({
  result,
  selectedBlockIndex = 0,
}: {
  result: BlockNestingResult;
  selectedBlockIndex?: number;
}) {
  const block = result.blockDetails[selectedBlockIndex];
  if (!block) return null;

  const blockPlacements = result.placements.filter(
    (p) => p.blockIndex === selectedBlockIndex,
  );

  const blockDims = block.dimensions;
  const blockSize: [number, number, number] = [
    blockDims.length,
    blockDims.height,
    blockDims.width,
  ];

  // Calcula escala para caber na viewport (normaliza para ~400 unidades)
  const maxDim = Math.max(blockDims.length, blockDims.width, blockDims.height);
  const scale = 400 / maxDim;

  return (
    <group scale={[scale, scale, scale]}>
      {/* Bloco de espuma (wireframe) */}
      <Block3D
        dimensions={blockSize}
        position={[0, 0, 0]}
        color="#cbd5e1"
        opacity={0.15}
        wireframe={true}
      />

      {/* Grade de referência */}
      <Grid
        args={[blockDims.length * 1.2, blockDims.width * 1.2]}
        position={[0, -blockDims.height / 2 - 10, 0]}
        cellColor="#94a3b8"
        sectionColor="#64748b"
        fadeDistance={blockDims.length * 2}
        fadeStrength={1}
      />

      {/* Peças cortadas */}
      {blockPlacements.map((part, idx) => {
        const extendedPart = part as ExtendedPlacedPart;
        if (extendedPart.polygon && extendedPart.polygon.length >= 3) {
          return (
            <PolygonPart3D
              key={idx}
              part={extendedPart}
              blockDimensions={blockDims}
            />
          );
        }
        return <Part3D key={idx} part={part} blockDimensions={blockDims} />;
      })}

      {/* Iluminação */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      <pointLight position={[0, blockDims.height, 0]} intensity={0.4} />
    </group>
  );
}

export default function FoamBlock3DViewer({
  result,
  selectedBlockIndex = 0,
}: FoamBlock3DViewerProps) {
  const block = result.blockDetails[selectedBlockIndex];
  if (!block) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Nenhum bloco disponível para visualização
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-[600px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border shadow-lg"
      style={{ overflow: "hidden" }}
    >
      {/* Info overlay */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border max-w-[200px]">
        <div className="text-xs font-semibold text-slate-800 mb-1">
          Bloco #{selectedBlockIndex + 1}
        </div>
        <div className="text-xs text-slate-600 space-y-0.5">
          <div className="truncate">
            📦 {block.dimensions.length}×{block.dimensions.width}×
            {block.dimensions.height}mm
          </div>
          <div>
            🔢 {block.partsCount} peça{block.partsCount !== 1 ? "s" : ""}
          </div>
          <div>📊 {block.utilizationPercent.toFixed(1)}%</div>
        </div>
      </div>

      {/* Controls info */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border max-w-[180px]">
        <div className="text-xs text-slate-600 space-y-0.5">
          <div className="font-medium text-slate-800 mb-1">🎮 Controlos</div>
          <div className="truncate">🖱️ Arrastar: Rodar</div>
          <div className="truncate">🔍 Scroll: Zoom</div>
          <div className="truncate">⌨️ Shift: Pan</div>
        </div>
      </div>

      {/* Legenda de cores */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border max-w-[160px]">
        <div className="text-xs font-medium text-slate-800 mb-1.5">
          🎨 Camadas Z
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { color: "#22c55e", label: "L0" },
            { color: "#3b82f6", label: "L1" },
            { color: "#ef4444", label: "L2" },
            { color: "#f59e0b", label: "L3" },
          ].map((layer) => (
            <div key={layer.label} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded"
                style={{ backgroundColor: layer.color }}
              />
              <span className="text-xs text-slate-600">{layer.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas 3D */}
      <Canvas>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[600, 400, 600]} />
          <Scene result={result} selectedBlockIndex={selectedBlockIndex} />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={200}
            maxDistance={2000}
            autoRotate={false}
            autoRotateSpeed={0.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
