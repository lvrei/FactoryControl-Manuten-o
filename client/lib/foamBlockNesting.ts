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
 *
 * @param parts - Peças a serem cortadas
 * @param constraints - Limites da máquina CNC
 * @param maximize - Se true, usa limites MÁXIMOS da CNC para aproveitar ao máximo (primeiro bloco)
 *                   Se false, otimiza para o tamanho mínimo necessário (blocos seguintes)
 */
export function calculateOptimalBlockSize(
  parts: FoamPart[],
  constraints: BlockConstraints,
  maximize: boolean = false,
): { block: FoamBlock; adjustedMargin: number } {
  if (parts.length === 0) {
    return {
      block: {
        length: Math.min(2500, constraints.maxLength),
        width: Math.min(2300, constraints.maxWidth),
        height: Math.min(1300, constraints.maxHeight),
      },
      adjustedMargin: constraints.margin, // Usa margem padrão se não há peças
    };
  }

  // Encontra as dimensões máximas das peças (para validar que cabem)
  const maxPartLength = Math.max(...parts.map((p) => p.length));
  const maxPartWidth = Math.max(...parts.map((p) => p.width));
  const maxPartHeight = Math.max(...parts.map((p) => p.height));

  // Calcula margens ajustadas automaticamente se necessário
  let adjustedMargin = constraints.margin;

  // Verifica se as peças cabem com as margens atuais
  const spaceNeededLength =
    maxPartLength + 2 * constraints.margin + constraints.kerf;
  const spaceNeededWidth =
    maxPartWidth + 2 * constraints.margin + constraints.kerf;
  const spaceNeededHeight =
    maxPartHeight + 2 * constraints.margin + constraints.kerf;

  // Se não couber, reduz margens automaticamente (mínimo 5mm)
  if (
    spaceNeededLength > constraints.maxLength ||
    spaceNeededWidth > constraints.maxWidth ||
    spaceNeededHeight > constraints.maxHeight
  ) {
    // Calcula margem máxima possível para cada dimensão
    const maxMarginLength = Math.floor(
      (constraints.maxLength - maxPartLength - constraints.kerf) / 2,
    );
    const maxMarginWidth = Math.floor(
      (constraints.maxWidth - maxPartWidth - constraints.kerf) / 2,
    );
    const maxMarginHeight = Math.floor(
      (constraints.maxHeight - maxPartHeight - constraints.kerf) / 2,
    );

    adjustedMargin = Math.max(
      5,
      Math.min(maxMarginLength, maxMarginWidth, maxMarginHeight),
    );

    // Se mesmo com margens mínimas não couber, erro
    if (adjustedMargin < 5) {
      const dimension =
        maxPartLength + constraints.kerf > constraints.maxLength
          ? "comprimento"
          : maxPartWidth + constraints.kerf > constraints.maxWidth
            ? "largura"
            : "altura";
      const partSize =
        dimension === "comprimento"
          ? maxPartLength
          : dimension === "largura"
            ? maxPartWidth
            : maxPartHeight;
      const maxSize =
        dimension === "comprimento"
          ? constraints.maxLength
          : dimension === "largura"
            ? constraints.maxWidth
            : constraints.maxHeight;

      throw new Error(
        `Peça muito grande! ${dimension.charAt(0).toUpperCase() + dimension.slice(1)}: ${partSize}mm + kerf (${constraints.kerf}mm) = ${partSize + constraints.kerf}mm excede limite da CNC (${maxSize}mm). ` +
          `Não é possível aplicar margens mínimas de segurança.`,
      );
    }

    console.warn(
      `⚠️ Margens reduzidas automaticamente de ${constraints.margin}mm para ${adjustedMargin}mm para caber peças no limite da CNC`,
    );
  }

  let blockLength: number;
  let blockWidth: number;
  let blockHeight: number;

  if (maximize) {
    // MODO MAXIMIZAR: Usa limites MÁXIMOS da CNC para aproveitar todo o espaço
    // Ideal para o primeiro bloco quando queremos colocar o máximo de peças possível
    console.log("🔧 Modo MAXIMIZAR: Usando limites máximos da CNC");
    blockLength = constraints.maxLength;
    blockWidth = constraints.maxWidth;
    blockHeight = constraints.maxHeight;
  } else {
    // MODO OTIMIZAR: Calcula tamanho MÍNIMO necessário para as peças restantes
    // Ideal para blocos subsequentes com menos peças
    console.log("🔧 Modo OTIMIZAR: Calculando tamanho mínimo necessário");
    const minBlockLength =
      maxPartLength + 2 * adjustedMargin + constraints.kerf;
    const minBlockWidth = maxPartWidth + 2 * adjustedMargin + constraints.kerf;

    // Arredonda PARA CIMA para múltiplos de 50mm (garante que cabe)
    blockLength = Math.ceil(minBlockLength / 50) * 50;
    blockWidth = Math.ceil(minBlockWidth / 50) * 50;

    // Limita ao máximo da CNC (não deve acontecer se validação acima passou)
    blockLength = Math.min(blockLength, constraints.maxLength);
    blockWidth = Math.min(blockWidth, constraints.maxWidth);

    // Garante mínimo de 500mm em comprimento e largura
    blockLength = Math.max(500, blockLength);
    blockWidth = Math.max(500, blockWidth);

    // ALTURA: Usa o MÁXIMO da CNC para permitir empilhamento em múltiplas camadas (Z)
    blockHeight = constraints.maxHeight;
  }

  return {
    block: {
      length: blockLength,
      width: blockWidth,
      height: blockHeight,
    },
    adjustedMargin,
  };
}

/**
 * Algoritmo de nesting 3D otimizado
 * Usa estratégia de empacotamento em camadas com melhor aproveitamento de espaço
 */
export function nestPartsInBlock(
  parts: FoamPart[],
  block: FoamBlock,
  kerf: number,
  margin: number,
): PlacedPart[] {
  const placements: PlacedPart[] = [];

  // Ordena por área decrescente (maiores primeiro para melhor empacotamento)
  const sortedParts = [...parts].sort(
    (a, b) => b.length * b.width - a.length * a.width,
  );

  const usableLength = block.length - 2 * margin;
  const usableWidth = block.width - 2 * margin;
  const usableHeight = block.height - 2 * margin;

  console.log(
    `[nestPartsInBlock] 🎯 Alocando ${sortedParts.length} peças em bloco ${block.length}×${block.width}×${block.height}mm`,
  );
  console.log(
    `[nestPartsInBlock] 📦 Espaço útil: ${usableLength}×${usableWidth}×${usableHeight}mm (margens ${margin}mm, kerf ${kerf}mm)`,
  );

  // Calcula quantas peças cabem por camada (padrão regular)
  if (sortedParts.length > 0) {
    const firstPart = sortedParts[0];

    // Tenta orientações diferentes para maximizar
    const orientation1 = {
      perLength: Math.floor(usableLength / (firstPart.length + kerf)),
      perWidth: Math.floor(usableWidth / (firstPart.width + kerf)),
      total:
        Math.floor(usableLength / (firstPart.length + kerf)) *
        Math.floor(usableWidth / (firstPart.width + kerf)),
    };

    // Rotação 90° (troca length <-> width)
    const orientation2 = {
      perLength: Math.floor(usableLength / (firstPart.width + kerf)),
      perWidth: Math.floor(usableWidth / (firstPart.length + kerf)),
      total:
        Math.floor(usableLength / (firstPart.width + kerf)) *
        Math.floor(usableWidth / (firstPart.length + kerf)),
    };

    const bestOrientation =
      orientation1.total >= orientation2.total ? orientation1 : orientation2;
    const useRotation = orientation2.total > orientation1.total;

    console.log(
      `[nestPartsInBlock] 🔄 Orientação: ${useRotation ? "ROTACIONADA 90°" : "PADRÃO"}`,
    );
    console.log(
      `[nestPartsInBlock] 📐 Peças por camada: ${bestOrientation.perLength} × ${bestOrientation.perWidth} = ${bestOrientation.total}`,
    );

    // Calcula quantas camadas cabem em Z
    const layersZ = Math.floor(usableHeight / (firstPart.height + kerf));
    console.log(
      `[nestPartsInBlock] 📏 Camadas em Z: ${layersZ} (altura peça: ${firstPart.height}mm + kerf ${kerf}mm)`,
    );

    // Empacotamento em grade regular 3D
    let partIndex = 0;
    for (let z = 0; z < layersZ && partIndex < sortedParts.length; z++) {
      const currentZ = margin + z * (firstPart.height + kerf);

      for (
        let ix = 0;
        ix < bestOrientation.perLength && partIndex < sortedParts.length;
        ix++
      ) {
        for (
          let iy = 0;
          iy < bestOrientation.perWidth && partIndex < sortedParts.length;
          iy++
        ) {
          const part = sortedParts[partIndex];

          // Aplica rotação se necessário
          const partLength = useRotation ? part.width : part.length;
          const partWidth = useRotation ? part.length : part.width;

          const x = margin + ix * (partLength + kerf);
          const y = margin + iy * (partWidth + kerf);

          // Verifica se cabe
          if (
            x + partLength <= block.length - margin &&
            y + partWidth <= block.width - margin &&
            currentZ + part.height <= block.height - margin
          ) {
            placements.push({
              ...part,
              length: partLength,
              width: partWidth,
              x,
              y,
              z: currentZ,
              blockIndex: 0,
            });
            partIndex++;
          }
        }
      }
    }

    const capacity = bestOrientation.total * layersZ;
    const efficiency =
      (placements.length / Math.min(capacity, sortedParts.length)) * 100;
    console.log(
      `[nestPartsInBlock] ✅ Alocado: ${placements.length}/${sortedParts.length} peças (capacidade: ${capacity}, eficiência: ${efficiency.toFixed(1)}%)`,
    );
  }

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

  // Primeiro bloco: MAXIMIZA uso da CNC para caber o máximo de peças possível
  // Blocos seguintes: OTIMIZA tamanho para peças restantes
  let adjustedMargin: number;

  // Debug: mostra maior peça
  const maxPart = parts.reduce((max, p) =>
    p.length * p.width * p.height > max.length * max.width * max.height
      ? p
      : max,
  );
  console.log("[Foam Nesting] Maior peça:", {
    dims: `${maxPart.length}×${maxPart.width}×${maxPart.height}mm`,
  });

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
    // ESTRATÉGIA INTELIGENTE:
    // - MAXIMIZA se tiver muitas peças restantes (>= 50% da capacidade de 1 bloco)
    // - OTIMIZA se tiver poucas peças (< 50% da capacidade)

    // Calcula capacidade estimada de 1 bloco para decidir estratégia
    const samplePart = remainingParts[0];
    const estimatedPerLayer = Math.max(
      1,
      Math.floor(
        (constraints.maxLength - 2 * constraints.margin) /
          (samplePart.length + constraints.kerf),
      ) *
        Math.floor(
          (constraints.maxWidth - 2 * constraints.margin) /
            (samplePart.width + constraints.kerf),
        ),
    );
    const estimatedLayers = Math.max(
      1,
      Math.floor(
        (constraints.maxHeight - 2 * constraints.margin) /
          (samplePart.height + constraints.kerf),
      ),
    );
    const estimatedCapacity = estimatedPerLayer * estimatedLayers;

    // Se temos peças >= 50% da capacidade de um bloco completo, MAXIMIZA
    // Caso contrário, OTIMIZA
    const shouldMaximize = remainingParts.length >= estimatedCapacity * 0.5;

    const { block: currentBlock, adjustedMargin: blockMargin } =
      calculateOptimalBlockSize(remainingParts, constraints, shouldMaximize);

    adjustedMargin = blockMargin;
    blocks.push(currentBlock);

    console.log(
      `[Foam Nesting] 📦 Bloco ${blockIndex + 1} (${shouldMaximize ? "🔝 MAXIMIZADO" : "🎯 OTIMIZADO"}):`,
      currentBlock,
      `| Peças restantes: ${remainingParts.length} | Capacidade estimada: ${estimatedCapacity} | Margens: ${blockMargin}mm`,
    );

    const placements = nestPartsInBlock(
      remainingParts,
      currentBlock,
      constraints.kerf,
      blockMargin, // Usa margem específica deste bloco
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
      console.error(
        "[Foam Nesting] ERRO: Nenhuma peça colocada no bloco! Verificar dimensões.",
      );
      console.error("[Foam Nesting] Bloco:", currentBlock);
      console.error(
        "[Foam Nesting] Primeira peça restante:",
        remainingParts[0],
      );
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
