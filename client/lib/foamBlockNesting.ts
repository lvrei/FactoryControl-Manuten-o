/**
 * Sistema de Nesting para Blocos de Espuma 3D
 *
 * Workflow:
 * 1. Bloco Grande (40m×2m×1.2m) → BZM corta blocos menores
 * 2. Bloco Menor (limitado por CNC) → CNC-01 faz nesting
 * 3. Peças Finais
 */

export type FoamBlock = {
  length: number; // mm - comprimento
  width: number; // mm - largura
  height: number; // mm - espessura/altura
};

export type FoamPart = {
  length: number; // mm
  width: number; // mm
  height: number; // mm (espessura)
  quantity: number;
  label?: string;
  foamTypeId?: string;
};

export type BlockConstraints = {
  maxLength: number; // mm - limite da CNC
  maxWidth: number; // mm - limite da CNC
  maxHeight: number; // mm - limite da CNC
  kerf: number; // mm - espessura do corte
  margin: number; // mm - margem de segurança
};

export type PlacedPart = FoamPart & {
  x: number; // posição no bloco
  y: number; // posição no bloco
  z: number; // posição no bloco (altura)
  blockIndex: number; // qual bloco menor
  rotated?: boolean; // se foi rotacionada
};

export type BlockNestingResult = {
  // Blocos menores necessários (cortados pela BZM)
  smallBlocks: FoamBlock[];

  // Peças colocadas em cada bloco (para CNC)
  placements: PlacedPart[];

  // Estatísticas
  totalBlocksNeeded: number; // quantos blocos a BZM deve cortar
  totalPartsPlaced: number; // total de peças
  utilization: number; // % aproveitamento médio

  // Detalhes por bloco
  blockDetails: {
    blockIndex: number;
    dimensions: FoamBlock;
    partsCount: number;
    utilizationPercent: number;
  }[];
};

/**
 * Calcula volume de um bloco ou peça
 */
export function calculateVolume(item: FoamBlock | FoamPart): number {
  return (item.length * item.width * item.height) / 1e9; // m³
}

/**
 * Verifica se uma peça cabe em um bloco considerando kerf e margem
 */
export function canFitInBlock(
  part: FoamPart,
  block: FoamBlock,
  kerf: number,
  margin: number,
  rotated = false,
): boolean {
  const effLength = rotated ? part.width : part.length;
  const effWidth = rotated ? part.length : part.width;

  const availLength = block.length - 2 * margin;
  const availWidth = block.width - 2 * margin;
  const availHeight = block.height - 2 * margin;

  return (
    effLength + kerf <= availLength &&
    effWidth + kerf <= availWidth &&
    part.height + kerf <= availHeight
  );
}

/**
 * Calcula as dimensões ótimas do bloco menor baseado nas peças
 * Usa os limites MÁXIMOS da CNC para aproveitar ao máximo
 */
export function calculateOptimalBlockSize(
  parts: FoamPart[],
  constraints: BlockConstraints,
): FoamBlock {
  if (parts.length === 0) {
    return {
      length: Math.min(2500, constraints.maxLength),
      width: Math.min(2300, constraints.maxWidth),
      height: Math.min(1300, constraints.maxHeight),
    };
  }

  // Encontra as dimensões máximas das peças (para validar que cabem)
  const maxPartLength = Math.max(...parts.map((p) => p.length));
  const maxPartWidth = Math.max(...parts.map((p) => p.width));
  const maxPartHeight = Math.max(...parts.map((p) => p.height));

  // Valida que as peças cabem nos limites da CNC
  if (maxPartLength + 2 * constraints.margin > constraints.maxLength) {
    throw new Error(
      `Peça com ${maxPartLength}mm de comprimento não cabe na CNC (máx: ${constraints.maxLength}mm)`,
    );
  }
  if (maxPartWidth + 2 * constraints.margin > constraints.maxWidth) {
    throw new Error(
      `Peça com ${maxPartWidth}mm de largura não cabe na CNC (máx: ${constraints.maxWidth}mm)`,
    );
  }
  if (maxPartHeight + 2 * constraints.margin > constraints.maxHeight) {
    throw new Error(
      `Peça com ${maxPartHeight}mm de altura não cabe na CNC (máx: ${constraints.maxHeight}mm)`,
    );
  }

  // Usa os LIMITES MÁXIMOS da CNC para aproveitar ao máximo
  let blockLength = constraints.maxLength;
  let blockWidth = constraints.maxWidth;
  let blockHeight = constraints.maxHeight;

  // Arredonda para baixo para múltiplos de 50mm (mais fácil de cortar)
  blockLength = Math.floor(blockLength / 50) * 50;
  blockWidth = Math.floor(blockWidth / 50) * 50;
  blockHeight = Math.floor(blockHeight / 50) * 50;

  // Garante mínimo de 500mm em comprimento e largura, 100mm em altura
  blockLength = Math.max(500, blockLength);
  blockWidth = Math.max(500, blockWidth);
  blockHeight = Math.max(100, blockHeight);

  return {
    length: blockLength,
    width: blockWidth,
    height: blockHeight,
  };
}

/**
 * Algoritmo de nesting 3D simplificado
 * Usa estratégia de camadas (layers) em Z
 */
export function nestPartsInBlock(
  parts: FoamPart[],
  block: FoamBlock,
  kerf: number,
  margin: number,
): PlacedPart[] {
  const placements: PlacedPart[] = [];

  // As peças já vêm expandidas (quantity: 1) da função nestFoamParts
  // Ordena por volume decrescente (maiores primeiro)
  const sortedParts = [...parts].sort((a, b) => calculateVolume(b) - calculateVolume(a));

  const usableLength = block.length - 2 * margin;
  const usableWidth = block.width - 2 * margin;
  const usableHeight = block.height - 2 * margin;

  let currentZ = margin;
  let currentLayer: PlacedPart[] = [];

  console.log(`[nestPartsInBlock] Tentando alocar ${sortedParts.length} peças em bloco ${block.length}x${block.width}x${block.height}`);

  for (const part of sortedParts) {
    let placed = false;

    // Tenta colocar na camada atual
    if (currentZ + part.height + kerf <= block.height - margin) {
      // Tenta posições em grade na camada
      const step = 50; // passo de 50mm

      for (let y = margin; y <= usableWidth - part.width; y += step) {
        if (placed) break;

        for (let x = margin; x <= usableLength - part.length; x += step) {
          // Verifica colisão com peças já colocadas nesta camada
          const collision = currentLayer.some((p) => {
            return !(
              x + part.length + kerf <= p.x ||
              p.x + p.length + kerf <= x ||
              y + part.width + kerf <= p.y ||
              p.y + p.width + kerf <= y
            );
          });

          if (!collision) {
            const placement: PlacedPart = {
              ...part,
              x,
              y,
              z: currentZ,
              blockIndex: 0, // será ajustado depois
            };
            placements.push(placement);
            currentLayer.push(placement);
            placed = true;
            break;
          }
        }
      }
    }

    // Se não coube na camada atual, tenta nova camada
    if (!placed && currentLayer.length > 0) {
      const maxHeightInLayer = Math.max(...currentLayer.map((p) => p.height));
      currentZ += maxHeightInLayer + kerf;
      currentLayer = [];

      // Tenta colocar na nova camada
      if (currentZ + part.height + kerf <= block.height - margin) {
        const placement: PlacedPart = {
          ...part,
          x: margin,
          y: margin,
          z: currentZ,
          blockIndex: 0,
        };
        placements.push(placement);
        currentLayer.push(placement);
        placed = true;
      }
    }

    // Se ainda não coube (primeira peça da primeira camada)
    if (!placed && currentLayer.length === 0) {
      const placement: PlacedPart = {
        ...part,
        x: margin,
        y: margin,
        z: currentZ,
        blockIndex: 0,
      };
      placements.push(placement);
      currentLayer.push(placement);
    }
  }

  console.log(`[nestPartsInBlock] Total alocado: ${placements.length} de ${sortedParts.length} peças`);

  return placements;
}

/**
 * Função principal: Calcula nesting de peças em blocos de espuma
 *
 * @param parts - Peças a serem cortadas
 * @param constraints - Limites da máquina CNC
 * @returns Resultado completo do nesting
 */
export function nestFoamParts(
  parts: FoamPart[],
  constraints: BlockConstraints,
): BlockNestingResult {
  if (parts.length === 0) {
    return {
      smallBlocks: [],
      placements: [],
      totalBlocksNeeded: 0,
      totalPartsPlaced: 0,
      utilization: 0,
      blockDetails: [],
    };
  }

  console.log(
    "[Foam Nesting] Iniciando nesting de",
    parts.length,
    "tipos de peças",
  );
  console.log("[Foam Nesting] Limites CNC:", constraints);

  // Calcula dimensões ótimas do bloco menor
  const blockSize = calculateOptimalBlockSize(parts, constraints);
  console.log("[Foam Nesting] Tamanho do bloco otimizado:", blockSize);

  const allPlacements: PlacedPart[] = [];
  const blocks: FoamBlock[] = [];
  let blockIndex = 0;

  // Expande quantidades
  const expandedParts: FoamPart[] = [];
  for (const part of parts) {
    for (let i = 0; i < part.quantity; i++) {
      expandedParts.push({ ...part, quantity: 1 });
    }
  }

  console.log(
    "[Foam Nesting] Total de peças individuais:",
    expandedParts.length,
  );

  let remainingParts = [...expandedParts];

  // Preenche blocos até todas as peças serem alocadas
  while (remainingParts.length > 0) {
    const currentBlock = { ...blockSize };
    blocks.push(currentBlock);

    const placements = nestPartsInBlock(
      remainingParts,
      currentBlock,
      constraints.kerf,
      constraints.margin,
    );

    // Marca índice do bloco
    placements.forEach((p) => {
      p.blockIndex = blockIndex;
    });

    allPlacements.push(...placements);

    // Remove peças já colocadas
    const placedCount = placements.length;
    remainingParts = remainingParts.slice(placedCount);

    console.log(
      `[Foam Nesting] Bloco ${blockIndex + 1}: ${placedCount} peças colocadas, ${remainingParts.length} restantes`,
    );

    // Se não colocou nenhuma peça neste bloco, algo está errado
    if (placedCount === 0) {
      console.error('[Foam Nesting] ERRO: Nenhuma peça colocada no bloco! Verificar dimensões.');
      console.error('[Foam Nesting] Bloco:', currentBlock);
      console.error('[Foam Nesting] Primeira peça restante:', remainingParts[0]);
      break;
    }

    blockIndex++;

    // Segurança: máximo 100 blocos (evita loop infinito)
    if (blockIndex >= 100) {
      console.error("[Foam Nesting] ERRO: Máximo de blocos atingido!");
      break;
    }
  }

  // Calcula estatísticas por bloco
  const blockDetails = blocks.map((block, idx) => {
    const blockPlacements = allPlacements.filter((p) => p.blockIndex === idx);
    const totalVolume = calculateVolume(block);
    const usedVolume = blockPlacements.reduce(
      (sum, p) => sum + calculateVolume(p),
      0,
    );

    return {
      blockIndex: idx,
      dimensions: block,
      partsCount: blockPlacements.length,
      utilizationPercent:
        totalVolume > 0 ? (usedVolume / totalVolume) * 100 : 0,
    };
  });

  const avgUtilization =
    blockDetails.length > 0
      ? blockDetails.reduce((sum, b) => sum + b.utilizationPercent, 0) /
        blockDetails.length
      : 0;

  const result: BlockNestingResult = {
    smallBlocks: blocks,
    placements: allPlacements,
    totalBlocksNeeded: blocks.length,
    totalPartsPlaced: allPlacements.length,
    utilization: avgUtilization / 100,
    blockDetails,
  };

  console.log("[Foam Nesting] Resultado:", {
    blocos: result.totalBlocksNeeded,
    peças: result.totalPartsPlaced,
    utilização: `${avgUtilization.toFixed(1)}%`,
  });

  return result;
}

/**
 * Converte resultado de nesting em operações para a OP
 *
 * Gera:
 * 1. Operação BZM: cortar blocos menores (quantidade = número de blocos)
 * 2. Operação CNC-01: fazer nesting das peças finais
 */
export function convertNestingToOperations(
  nestingResult: BlockNestingResult,
  foamTypeId: string,
  bzmMachineId: string,
  cncMachineId: string,
): {
  bzmOperation: {
    machineId: string;
    quantity: number; // número de blocos
    inputDimensions: FoamBlock; // bloco grande original
    outputDimensions: FoamBlock; // bloco menor
  };
  cncOperation: {
    machineId: string;
    quantity: number; // número total de peças
    inputDimensions: FoamBlock; // bloco menor
    parts: PlacedPart[]; // peças com posições
  };
} {
  if (nestingResult.smallBlocks.length === 0) {
    throw new Error("Nenhum bloco gerado no nesting");
  }

  // BZM: Corta blocos menores
  const smallBlock = nestingResult.smallBlocks[0]; // todos têm mesmo tamanho

  const bzmOperation = {
    machineId: bzmMachineId,
    quantity: nestingResult.totalBlocksNeeded,
    inputDimensions: {
      // Bloco grande padrão (será ajustado baseado no tipo de espuma)
      length: 40000, // 40m
      width: 2000, // 2m
      height: 1200, // 1.2m
    },
    outputDimensions: smallBlock,
  };

  // CNC: Faz nesting das peças
  const cncOperation = {
    machineId: cncMachineId,
    quantity: nestingResult.totalPartsPlaced,
    inputDimensions: smallBlock,
    parts: nestingResult.placements,
  };

  return {
    bzmOperation,
    cncOperation,
  };
}
