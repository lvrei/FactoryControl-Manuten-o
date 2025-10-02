# 📝 Entrada Manual de Formas para Nesting

## Resumo

Sistema de nesting agora permite **criar formas manualmente** sem precisar de ficheiros DXF/JSON!

## Nova Funcionalidade

### ✅ O Que Foi Adicionado

**2 modos de entrada de peças:**

1. **Ficheiro** (DXF/JSON) - modo existente
2. **Manual** (novo!) - criar quadrados e retângulos diretamente na interface

### ✅ Componente Criado

**`client/components/production/ManualShapeInput.tsx`** (263 linhas)

- Formulário intuitivo para adicionar formas
- Suporte para quadrados e retângulos
- Lista de formas adicionadas com preview
- Validação de dados
- Remoção de formas

### ✅ Integração no Modal

**`client/components/production/NestingModalPolygon.tsx`**

- Novo seletor: "Ficheiro" vs "Manual"
- Combina formas manuais com formas de ficheiros
- Estatísticas mostram formas manuais
- Nesting funciona com ambas as origens

---

## Como Usar

### Passo 1: Abrir Modal de Nesting

```
1. Ir para página "Produção"
2. Clicar em "Nova OP (nesting)"
3. Modal abre com opções
```

### Passo 2: Escolher "Manual"

```
1. Ver seletor "Origem das Peças"
2. Clicar em "Manual" (ícone de lápis)
3. Formulário de entrada aparece
```

### Passo 3: Adicionar Formas

#### Para Retângulo:

```
1. Deixar "Retângulo" selecionado (padrão)
2. Comprimento: 500mm
3. Largura: 300mm
4. Espessura: 50mm
5. Quantidade: 10
6. Etiqueta (opcional): "Tampa lateral"
7. Clicar "Adicionar à Lista"
```

#### Para Quadrado:

```
1. Clicar em "Quadrado"
2. Lado: 400mm (largura fica igual automaticamente)
3. Espessura: 50mm
4. Quantidade: 5
5. Etiqueta (opcional): "Base quadrada"
6. Clicar "Adicionar à Lista"
```

### Passo 4: Revisar Lista

```
✅ Vê formas adicionadas
✅ Total de peças calculado
✅ Pode remover formas (ícone lixeira)
```

### Passo 5: Configurar Nesting

```
1. Tipo de Espuma: selecionar
2. Dimensões do Painel: 2000×1000mm
3. Kerf: 5mm
4. Margem: 10mm
5. Ver preview do layout
```

### Passo 6: Aplicar na OP

```
1. Revisar estatísticas:
   - Painéis necessários
   - % Utilização
   - Formas manuais: X tipos • Y peças
2. Clicar "Aplicar na OP"
3. Pronto!
```

---

## Interface do Formulário

### Tipo de Forma

```
┌─────────────┬─────────────┐
│ Retângulo   │  Quadrado   │  ← Seletor
└─────────────┴─────────────┘
```

### Campos (Retângulo)

```
Comprimento (mm):  [500    ]
Largura (mm):      [300    ]
Espessura (mm):    [50     ]
Quantidade:        [10     ]
Etiqueta:          [Tampa A]  ← Opcional
```

### Campos (Quadrado)

```
Lado (mm):         [400    ]
Largura (mm):      [400    ]  ← Bloqueado (igual ao lado)
Espessura (mm):    [50     ]
Quantidade:        [5      ]
Etiqueta:          [Base   ]  ← Opcional
```

### Lista de Formas Adicionadas

```
┌──────────────────────────────────────┐
│ Formas Adicionadas (3)               │
├──────────────────────────────────────┤
│ □ Tampa A                        🗑️  │
│   500×300×50mm • Qtd: 10             │
├──────────────────��───────────────────┤
│ ■ Base                           🗑️  │
│   400×400×50mm • Qtd: 5              │
├──────────────────────────────────────┤
│ □ Lateral                        🗑️  │
│   600×200×30mm • Qtd: 20             │
├──────────────────────────────────────┤
│ Total: 3 tipos • 35 peças            │
└──────────────────────────────────────┘
```

---

## Funcionalidades

### ✅ Validação Automática

- ❌ Medidas ≤ 0 → Erro "Medidas devem ser maiores que zero"
- ❌ Quantidade ≤ 0 → Erro "Quantidade deve ser maior que zero"
- ✅ Valores válidos → Forma adicionada

### ✅ Quadrado Inteligente

- Ao selecionar "Quadrado":
  - Campo "Largura" fica bloqueado
  - Largura = Lado (sincronizado automaticamente)
  - Ao mudar "Lado", "Largura" atualiza junto

### ✅ Reset de Formulário

Após adicionar forma:

- ✅ Comprimento/Lado resetado para 100mm
- ✅ Largura resetada para 100mm
- ✅ Quantidade resetada para 1
- ✅ Etiqueta limpa
- ✅ **Espessura mantida** (conveniente para várias peças da mesma espessura)

### ✅ Etiquetas Automáticas

Se não fornecer etiqueta:

- Retângulo: "Retângulo 500×300mm"
- Quadrado: "Quadrado 400mm"

### ✅ Ícones Visuais

- 🔲 Retângulo horizontal
- ⬜ Quadrado
- 🗑️ Remover

---

## Integração com Nesting

### Combinação de Fontes

Pode usar **ambos** os modos simultaneamente:

```
1. Carregar DXF (5 formas)
2. Adicionar 3 formas manuais
3. Total: 8 formas para nesting ✅
```

### Cálculo de Nesting

Sistema combina todas as fontes:

```typescript
const allParts = [
  ...formasDoDXF, // Se ficheiro carregado
  ...formasManuais, // Se formas adicionadas
];

const result = packRectangles(allParts, sheet);
```

### Estatísticas Atualizadas

No painel de resultados:

```
┌────────────────────────────────┐
│ Painéis necessários: 3         │
│ Utilização: 67.8%              │
├────────────────────────────────┤
│ Formas manuais: 5 tipos • 45 peças │
└────────────────────────────────┘
```

---

## Casos de Uso

### 1. Peças Simples Repetitivas

**Cenário**: Precisa cortar 100 quadrados de 500mm

```
✅ Manual é mais rápido que criar DXF
✅ Menos passos
✅ Sem software CAD necessário
```

**Como fazer**:

1. Modo "Manual"
2. Quadrado: 500mm
3. Quantidade: 100
4. Aplicar

### 2. Mix de Peças

**Cenário**: Cliente pediu peças de vários tamanhos

```
Peça A: 500×300mm × 20 unidades
Peça B: 400×400mm × 15 unidades
Peça C: 600×200mm × 30 unidades
```

**Como fazer**:

1. Adicionar Peça A (retângulo)
2. Adicionar Peça B (quadrado)
3. Adicionar Peça C (retângulo)
4. Aplicar → Nesting otimizado!

### 3. Combinação DXF + Manual

**Cenário**: DXF tem formas complexas + precisa adicionar margens simples

```
✅ Carregar DXF (formas irregulares)
✅ Adicionar manualmente retângulos de margem
✅ Nesting combina tudo
```

### 4. Prototipagem Rápida

**Cenário**: Testar quantos painéis precisa antes de fazer DXF

```
✅ Entrada manual: rápida
✅ Ver resultado imediatamente
✅ Ajustar dimensões/quantidades
✅ Depois criar DXF definitivo
```

---

## Vantagens vs DXF

| Aspecto           | DXF                                  | Manual                          |
| ----------------- | ------------------------------------ | ------------------------------- |
| **Velocidade**    | 🐢 Lento (CAD → Exportar → Carregar) | ⚡ Rápido (direto na interface) |
| **Complexidade**  | ✅ Qualquer forma                    | ⚠️ Só retângulos/quadrados      |
| **Precisão**      | ✅ Exata                             | ✅ Exata                        |
| **Facilidade**    | ⚠️ Requer conhecimento CAD           | ✅ Qualquer pessoa consegue     |
| **Flexibilidade** | ⚠️ Difícil ajustar                   | ✅ Fácil ajustar/remover        |
| **Uso Ideal**     | Formas irregulares complexas         | Peças retangulares simples      |

---

## Fluxograma de Decisão

```
Preciso fazer nesting de peças?
         │
         ├─── São formas irregulares/complexas?
         │    └─── SIM → Usar DXF
         │
         └─── São retângulos/quadrados?
              │
              ├─── Muitos tamanhos diferentes (>10)?
              │    └─── SIM → DXF pode ser mais prático
              │
              └─── Poucos tamanhos (<10)?
                   └─── SIM → ✅ ENTRADA MANUAL!
```

---

## Validações e Regras

### ✅ Validações de Entrada

1. **Medidas > 0**: Comprimento, largura, espessura devem ser positivos
2. **Quantidade ≥ 1**: Mínimo 1 peça
3. **Etiqueta**: Opcional (máx 100 caracteres)

### ✅ Limite de Formas

- Não há limite teórico
- **Recomendado**: < 50 formas diferentes para performance
- Se > 50 tipos, considerar usar JSON/DXF

### ✅ Combinação de Modos

- ✅ Pode usar ficheiro E manual juntos
- ✅ Sistema combina automaticamente
- ✅ Estatísticas separadas

---

## Exemplos Práticos

### Exemplo 1: Caixas Simples

```
Cliente: "Preciso tampas e bases para caixas"

Solução:
1. Manual: Quadrado 500mm × 10 (tampas)
2. Manual: Quadrado 498mm × 10 (bases, encaixe)
3. Nesting → 2 painéis
```

### Exemplo 2: Embalagens

```
Cliente: "Laterais e divisórias"

Solução:
1. Retângulo 800×300mm × 20 (laterais)
2. Retângulo 400×300mm × 40 (divisórias)
3. Quadrado 300mm × 10 (reforços)
4. Nesting → 5 painéis
```

### Exemplo 3: Protótipos

```
Designer: "Quero testar tamanhos antes de decidir"

Workflow:
1. Entrada manual: 400mm
2. Ver nesting → 3 painéis
3. Ajustar para 450mm
4. Ver nesting → 4 painéis ❌
5. Voltar para 400mm ✅
6. Confirmar e produzir
```

---

## Estatísticas e Feedback

### No Painel de Resultados

```
┌──────────────────────────────────┐
│ 📦 Painéis necessários: 3        │
│ 📊 Utilização: 67.8%             │
│ 📐 Formas manuais:               │
│    • 5 tipos diferentes          │
│    • 45 peças no total           │
└──────────────────────────────────┘
```

### Na Lista de Formas

```
Total de peças: 45
Tipos diferentes: 5

(Atualiza em tempo real ao adicionar/remover)
```

---

## Limitações Conhecidas

### ⚠️ Formas Suportadas

- ✅ Retângulos
- ✅ Quadrados
- ❌ Círculos (usar DXF)
- ❌ Polígonos irregulares (usar DXF)
- ❌ Formas com furos (usar DXF)

### ⚠️ Funcionalidades

- ❌ Não permite rotação manual (automática no nesting)
- ❌ Não permite preview individual de forma
- ❌ Não permite editar forma já adicionada (só remover e readicionar)

### 🔧 Melhorias Futuras

- [ ] Editar formas já adicionadas
- [ ] Duplicar forma existente
- [ ] Importar/exportar lista de formas (CSV)
- [ ] Templates de formas comuns
- [ ] Preview 3D das peças

---

## Troubleshooting

### Problema: "Aplicar na OP" está desabilitado

**Causa**: Nenhuma forma adicionada
**Solução**: Adicionar pelo menos 1 forma manual ou carregar ficheiro

### Problema: Formas não aparecem no preview

**Causa**: Modo de nesting incompatível
**Solução**:

- Formas manuais → Usar modo "Retângulos"
- DXF irregular → Usar modo "Polígonos"

### Problema: Utilização muito baixa (< 30%)

**Causa**: Peças muito pequenas ou painel muito grande
**Solução**:

- Reduzir dimensões do painel
- Aumentar quantidade de peças
- Ajustar kerf/margem

---

## Código Relevante

### Arquivos Modificados

1. **`client/components/production/ManualShapeInput.tsx`** (novo)

   - Componente de entrada manual
   - 263 linhas

2. **`client/components/production/NestingModalPolygon.tsx`** (modificado)
   - Integração do modo manual
   - Combinação de fontes
   - UI atualizada

### Tipo de Dados

```typescript
export type ManualShape = NestPart & {
  id: string; // ID único gerado
  label?: string; // Etiqueta opcional
};

export type NestPart = {
  length: number; // mm
  width: number; // mm
  height: number; // mm (espessura)
  quantity: number; // unidades
  foamTypeId?: string;
  label?: string;
};
```

---

## Conclusão

🎉 **Sistema agora é muito mais acessível!**

Antes:

```
❌ Precisava CAD para qualquer peça
❌ Workflow longo (CAD → DXF → Upload)
❌ Difícil fazer ajustes rápidos
```

Agora:

```
✅ Peças simples → Entrada manual (segundos!)
✅ Peças complexas → DXF (quando necessário)
✅ Pode combinar ambos
✅ Workflow flexível e rápido
```

**Teste agora!** 🚀

Crie uma OP com formas manuais:

1. Nova OP (nesting)
2. Modo: Manual
3. Adicionar 3 retângulos diferentes
4. Ver preview do nesting
5. Aplicar na OP
6. ✅ Pronto em < 1 minuto!
