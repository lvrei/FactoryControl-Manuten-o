# 🧊 Nesting de Blocos de Espuma 3D - Implementação

## Problema Identificado

O sistema atual trata nesting como **placas 2D** (sheets), mas na realidade o material são **blocos 3D de espuma**.

## Workflow Correto

```
📦 Bloco Grande (40m × 2m × 1.2m)
       ↓ BZM corta
📦 Bloco Menor (≤ 2.5m × 2.3m × 1.3m) [limitado pela CNC]
       ↓ CNC-01 faz nesting
🔲 Peças Finais
```

## Requisitos

### 1. Dimensões dos Blocos

- **Bloco Grande**: 40m × 2m × 1.2m (padrão espuma)
- **Bloco Menor**: Máx 2.5m × 2.3m × 1.3m (limite CNC)

### 2. Workflow de Operações

1. **BZM**: Corta blocos grandes em blocos menores

   - Input: Bloco grande (40m × 2m × 1.2m)
   - Output: Bloco menor (calculado automaticamente)
   - Quantidade: **Número de blocos necessários** (resultado do nesting)

2. **CNC-01**: Faz nesting das peças nos blocos menores
   - Input: Bloco menor (da BZM)
   - Output: Peças finais
   - Quantidade: **Total de peças** a cortar

### 3. Cálculo de Blocos

- Se peças > capacidade de 1 bloco → próximo bloco
- Exemplo:
  - Peça: 2m × 100mm × 200mm × 50 unidades
  - Resultado: 3 blocos necessários
  - BZM: cortar 3 blocos
  - CNC: cortar 50 peças nos 3 blocos

## Arquivos Criados

### `client/lib/foamBlockNesting.ts` ✅

Contém toda a lógica de nesting 3D:

```typescript
// Tipos principais
type FoamBlock = { length, width, height }
type FoamPart = { length, width, height, quantity, label }
type BlockConstraints = { maxLength, maxWidth, maxHeight, kerf, margin }

// Funções principais
function nestFoamParts(parts, constraints): BlockNestingResult
function calculateOptimalBlockSize(parts, constraints): FoamBlock
function nestPartsInBlock(parts, block, kerf, margin): PlacedPart[]
function convertNestingToOperations(...): { bzmOperation, cncOperation }
```

#### Algoritmo de Nesting 3D

1. Calcula tamanho ótimo do bloco menor (baseado nas peças)
2. Usa estratégia de camadas (layers) em Z
3. Preenche cada camada com algoritmo 2D
4. Quando não cabe mais → próxima camada (Z)
5. Quando bloco cheio → próximo bloco

## Modificações Necessárias

### `client/components/production/NestingModalPolygon.tsx`

#### Estado Adicionado ✅

```typescript
const [nestingMode, setNestingMode] = useState<
  "rectangle" | "polygon" | "foam3d"
>(
  "foam3d", // Modo padrão
);

const [cncConstraints, setCncConstraints] = useState<BlockConstraints>({
  maxLength: 2500, // 2.5m
  maxWidth: 2300, // 2.3m
  maxHeight: 1300, // 1.3m
  kerf: 5,
  margin: 10,
});
```

#### Cálculo de Resultado ✅

```typescript
const foam3dResult = useMemo(() => {
  if (nestingMode !== "foam3d") return null;

  // Combina peças do ficheiro + manual
  const allParts: FoamPart[] = [...fromFile, ...manualShapes];

  return nestFoamParts(allParts, cncConstraints);
}, [drawing, cncConstraints, quantityMultiplier, nestingMode, manualShapes]);
```

#### applyToOrder() - Criar Operações ⏳

```typescript
function applyToOrder() {
  if (nestingMode === "foam3d" && foam3dResult) {
    // Encontrar máquinas
    const bzmMachine = machines.find((m) => m.type === "BZM");
    const cncMachine = machines.find((m) => m.id === "cnc-001"); // CNC-01

    // Criar linha com 2 operações
    const line: ProductionOrderLine = {
      id: generateId(),
      foamType: selectedFoam,
      initialDimensions: {
        // Bloco grande
        length: 40000,
        width: 2000,
        height: 1200,
      },
      finalDimensions: foam3dResult.smallBlocks[0], // Bloco menor
      quantity: foam3dResult.totalBlocksNeeded, // Número de blocos!
      completedQuantity: 0,
      cuttingOperations: [
        {
          // 1. BZM: Cortar blocos menores
          id: generateId(),
          machineId: bzmMachine.id,
          inputDimensions: {
            length: 40000,
            width: 2000,
            height: 1200,
          },
          outputDimensions: foam3dResult.smallBlocks[0],
          quantity: foam3dResult.totalBlocksNeeded, // Ex: 3 blocos
          completedQuantity: 0,
          estimatedTime: foam3dResult.totalBlocksNeeded * 15, // 15min/bloco
          status: "pending",
          observations: `Cortar ${foam3dResult.totalBlocksNeeded} blocos menores`,
        },
        {
          // 2. CNC-01: Fazer nesting das peças
          id: generateId(),
          machineId: cncMachine.id,
          inputDimensions: foam3dResult.smallBlocks[0],
          outputDimensions: foam3dResult.placements[0], // Primeira peça como ref
          quantity: foam3dResult.totalPartsPlaced, // Ex: 50 peças
          completedQuantity: 0,
          estimatedTime: foam3dResult.totalPartsPlaced * 2, // 2min/peça
          status: "pending",
          observations: `Nesting de ${foam3dResult.totalPartsPlaced} peças em ${foam3dResult.totalBlocksNeeded} blocos`,
          // IMPORTANTE: Guardar dados de nesting
          nestingData: JSON.stringify({
            placements: foam3dResult.placements,
            blockDetails: foam3dResult.blockDetails,
          }),
        },
      ],
      status: "pending",
      priority: 5,
    };

    onApply([line]);
    onClose();
  }
}
```

## UI Necessária

### Modo de Nesting

```tsx
<div className="grid grid-cols-3 gap-2">
  <button
    onClick={() => setNestingMode("rectangle")}
    className={nestingMode === "rectangle" ? "selected" : ""}
  >
    Retângulos 2D
  </button>
  <button
    onClick={() => setNestingMode("foam3d")}
    className={nestingMode === "foam3d" ? "selected" : ""}
  >
    Blocos 3D 🧊
  </button>
  <button
    onClick={() => setNestingMode("polygon")}
    className={nestingMode === "polygon" ? "selected" : ""}
  >
    Polígonos
  </button>
</div>
```

### Limites da CNC

```tsx
<div className="border rounded p-3">
  <h4 className="font-medium mb-2">Limites da CNC</h4>
  <div className="grid grid-cols-3 gap-2">
    <div>
      <label>Máx Comprimento (mm)</label>
      <input
        type="number"
        value={cncConstraints.maxLength}
        onChange={(e) =>
          setCncConstraints({
            ...cncConstraints,
            maxLength: Number(e.target.value),
          })
        }
      />
    </div>
    <div>
      <label>Máx Largura (mm)</label>
      <input
        type="number"
        value={cncConstraints.maxWidth}
        onChange={(e) =>
          setCncConstraints({
            ...cncConstraints,
            maxWidth: Number(e.target.value),
          })
        }
      />
    </div>
    <div>
      <label>Máx Altura (mm)</label>
      <input
        type="number"
        value={cncConstraints.maxHeight}
        onChange={(e) =>
          setCncConstraints({
            ...cncConstraints,
            maxHeight: Number(e.target.value),
          })
        }
      />
    </div>
  </div>
</div>
```

### Estatísticas Foam 3D

```tsx
{
  foam3dResult && (
    <div className="border rounded p-3 bg-muted/30">
      <h4 className="font-medium mb-2">Resultado Nesting 3D</h4>
      <div className="space-y-1 text-sm">
        <div>
          📦 Blocos necessários:{" "}
          <strong>{foam3dResult.totalBlocksNeeded}</strong>
        </div>
        <div>
          🔲 Total de peças: <strong>{foam3dResult.totalPartsPlaced}</strong>
        </div>
        <div>
          📊 Utilização média:{" "}
          <strong>{(foam3dResult.utilization * 100).toFixed(1)}%</strong>
        </div>
        <div className="pt-2 border-t">
          <strong>Dimensões do bloco menor:</strong>
          <div className="text-xs text-muted-foreground">
            {foam3dResult.smallBlocks[0].length}mm ×
            {foam3dResult.smallBlocks[0].width}mm ×
            {foam3dResult.smallBlocks[0].height}mm
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Visualização 3D (Simplificada)

```tsx
{
  foam3dResult && (
    <div className="border rounded p-2 bg-white">
      <h4 className="text-sm font-medium mb-2">
        Bloco 1 de {foam3dResult.totalBlocksNeeded}
      </h4>

      {/* Vista superior (plano XY) */}
      <svg width={400} height={300}>
        {foam3dResult.placements
          .filter((p) => p.blockIndex === 0)
          .map((p, idx) => {
            const scale = 0.15; // escala para caber no SVG
            return (
              <g key={idx}>
                <rect
                  x={p.x * scale}
                  y={p.y * scale}
                  width={p.length * scale}
                  height={p.width * scale}
                  fill={`hsl(${(p.z / 10) * 360}, 70%, 70%)`}
                  stroke="#333"
                  strokeWidth={1}
                />
                <text x={p.x * scale + 5} y={p.y * scale + 15} fontSize={10}>
                  #{idx + 1}
                </text>
                <text
                  x={p.x * scale + 5}
                  y={p.y * scale + 28}
                  fontSize={8}
                  fill="#666"
                >
                  Z:{Math.round(p.z)}mm
                </text>
              </g>
            );
          })}
      </svg>

      <div className="text-xs text-muted-foreground mt-2">
        Vista superior • Cores = altura (Z)
      </div>
    </div>
  );
}
```

## Exemplo de Uso

### Input

```
Peça: 2000mm × 100mm × 200mm
Quantidade: 50 unidades
Espuma: Densidade 30
CNC limites: 2500mm × 2300mm × 1300mm
```

### Cálculo

```typescript
1. Tamanho ótimo do bloco menor:
   - Comprimento: 2500mm (limite CNC)
   - Largura: 2300mm (limite CNC)
   - Altura: 1300mm (limite CNC)

2. Nesting das 50 peças:
   - Bloco 1: 18 peças (3 camadas de 6 peças)
   - Bloco 2: 18 peças
   - Bloco 3: 14 peças
   - TOTAL: 3 blocos

3. Utilização: 67.8%
```

### Output (OP criada)

```
Linha 1:
  Tipo de Espuma: Densidade 30
  Dimensões Iniciais: 40000mm × 2000mm × 1200mm (bloco grande)
  Dimensões Finais: 2500mm × 2300mm × 1300mm (bloco menor)
  Quantidade: 3 blocos

  Operação 1 - BZM:
    Máquina: BZM Principal
    Input: 40000×2000×1200mm
    Output: 2500×2300×1300mm
    Quantidade: 3 blocos ⬅️ IMPORTANTE
    Observações: "Cortar 3 blocos menores"

  Operação 2 - CNC-01:
    Máquina: CNC-01
    Input: 2500×2300×1300mm
    Output: 2000×100×200mm (peça final)
    Quantidade: 50 peças ⬅️ IMPORTANTE
    Observações: "Nesting de 50 peças em 3 blocos"
    Dados de nesting: {...placements...}
```

## Tarefas Pendentes

### ⏳ Implementação

- [ ] Completar `applyToOrder()` para foam3d
- [ ] Adicionar UI de seleção de modo nesting
- [ ] Adicionar UI de limites da CNC
- [ ] Adicionar visualização 3D simplificada
- [ ] Testar com dados reais

### 🔧 Melhorias Futuras

- [ ] Visualização 3D interativa (Three.js)
- [ ] Exportar dados de nesting para G-code
- [ ] Otimização de orientação de peças
- [ ] Suporte para blocos grandes customizados
- [ ] Cache de resultados de nesting
- [ ] Simulação de corte passo-a-passo

## Vantagens da Solução

### ✅ Correto

- Reflete o workflow real: Bloco Grande → BZM → Bloco Menor → CNC → Peças
- Quantidade de blocos na BZM = resultado do nesting
- Quantidade de peças na CNC = total solicitado

### ✅ Automático

- Calcula automaticamente tamanho ótimo do bloco menor
- Respeita limites da CNC
- Distribui peças em múltiplos blocos se necessário

### ✅ Flexível

- Suporta peças manuais + DXF
- Configurável (limites CNC, kerf, margem)
- Mantém compatibilidade com modos 2D existentes

### ✅ Rastreável

- Guarda dados de nesting em JSON
- Permite visualizar onde cada peça está
- Facilita troubleshooting

## Exemplo Completo

```typescript
// 1. Usuário adiciona peças manualmente
const manualShapes = [
  { length: 2000, width: 100, height: 200, quantity: 30, label: "Peça A" },
  { length: 1500, width: 150, height: 200, quantity: 20, label: "Peça B" },
];

// 2. Sistema calcula nesting
const result = nestFoamParts(manualShapes, {
  maxLength: 2500,
  maxWidth: 2300,
  maxHeight: 1300,
  kerf: 5,
  margin: 10,
});

// Resultado:
// - 3 blocos menores (2500×2300×1300mm)
// - 50 peças distribuídas nos 3 blocos
// - Utilização: 65.4%

// 3. Sistema gera OP
const line = {
  foamType: "Densidade 30",
  initialDimensions: { length: 40000, width: 2000, height: 1200 },
  finalDimensions: { length: 2500, width: 2300, height: 1300 },
  quantity: 3, // ⬅️ 3 blocos
  cuttingOperations: [
    {
      // BZM
      machineId: "bzm-001",
      quantity: 3, // ⬅️ Cortar 3 blocos
      ...
    },
    {
      // CNC-01
      machineId: "cnc-001",
      quantity: 50, // ⬅️ Cortar 50 peças
      nestingData: "{...}" // Posições exatas
      ...
    },
  ],
};
```

## Status

- ✅ Lógica de nesting 3D implementada (`foamBlockNesting.ts`)
- ✅ Tipos e estado adicionados ao modal
- ⏳ Integração UI pendente
- ⏳ Geração de operações BZM + CNC pendente
- ⏳ Testes pendentes

---

**Próximo passo**: Completar integração no `NestingModalPolygon.tsx` e testar com dados reais.
