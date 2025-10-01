# Guia de Exportação DXF - Nesting de Formas Irregulares

## 🎉 NOVIDADE: Suporte Completo para Formas Irregulares!

O sistema agora suporta **nesting de qualquer forma** - não apenas retângulos!

### ✅ Formas Suportadas
- **Polígonos irregulares** (qualquer número de lados)
- **Curvas e splines** (convertidas em segmentos)
- **Círculos e elipses**
- **Arcos**
- **Formas compostas** (múltiplos contornos)

---

## Como exportar DXF para usar no sistema de Nesting

### Configurações Recomendadas

Para garantir compatibilidade máxima, exporte seus ficheiros DXF com as seguintes configurações:

#### AutoCAD / BricsCAD
1. Comando: `SAVEAS` ou `EXPORT`
2. Escolha formato: **DXF**
3. Versão: **R12/LT2 ASCII** (melhor compatibilidade) ou **R2000/LT2000 ASCII**
4. ⚠️ **IMPORTANTE**: Marque "ASCII" (não "Binary")

#### QCAD
1. Menu: File → Export
2. Escolha: **DXF R12**
3. Certifique-se que está em modo texto (ASCII)

#### LibreCAD
1. Menu: File → Save As
2. Formato: **DXF R12** ou **DXF R2000**

#### SolidWorks / Inventor / Fusion 360
1. File → Export
2. Tipo: **DXF 2D**
3. Versão: **R12** ou **R2000/2004**
4. Selecione formato **ASCII**

---

## Tipos de Geometria Suportados

### ✅ Totalmente Suportados
- **LWPOLYLINE** - Polilinhas leves (formas irregulares)
- **POLYLINE** - Polilinhas tradicionais
- **LINE** - Linhas individuais
- **CIRCLE** - Círculos
- **ARC** - Arcos
- **ELLIPSE** - Elipses
- **SPLINE** - Curvas spline
- **INSERT** - Blocos inseridos

### ⚠️ Parcialmente Suportados
- **3DFACE**, **SOLID** - São ignorados (apenas 2D é suportado)
- **TEXT**, **MTEXT** - Texto é ignorado
- **DIMENSION** - Cotas são ignoradas
- **HATCH** - Padrões de preenchimento são ignorados

---

## 🔄 Modos de Nesting

O sistema oferece **2 modos de nesting**:

### 1. Modo Retângulo (Clássico)
- Usa bounding box das formas
- **Mais rápido** para cálculo
- **Maior aproveitamento** de material para peças retangulares
- Ideal para: cortes retos, caixas, painéis

### 2. Modo Polígono (NOVO!) ⭐
- Usa **forma real** das peças
- Suporta **rotação automática** (0°, 90°, 180°, 270°)
- **Detecção de colisões** entre formas irregulares
- Ideal para: formas complexas, peças orgânicas, curvas

**O sistema escolhe automaticamente o melhor modo** baseado no DXF carregado.

---

## Como Usar Nesting de Formas Irregulares

### Passo 1: Carregar DXF
```
1. Clique em "Nova OP (nesting)" na página de Produção
2. Selecione ficheiro DXF com suas formas
3. Sistema deteta automaticamente se são retângulos ou polígonos
```

### Passo 2: Configurar
```
- Modo de Nesting: Retângulos / Polígonos (automático)
- Espessura: altura da peça em mm
- Tipo de Espuma: material a cortar
- Dimensões do Painel: largura × comprimento
- Kerf: espessura do corte (serra/laser)
- Margem: distância das bordas
```

### Passo 3: Visualizar Resultado
```
- Vê layout do 1º painel
- Formas posicionadas e rotacionadas
- Estatísticas: painéis necessários, utilização
```

### Passo 4: Aplicar na OP
```
- Clique "Aplicar na OP"
- Linhas são criadas automaticamente
- Pronto para produção!
```

---

## Exemplo: Forma Irregular

Ficheiro: `forma_irregular.dxf`
```
Conteúdo: POLYLINE com 66 pontos (curva complexa)
Sistema deteta: 1 polígono irregular
Modo escolhido: Polígonos
Resultado: Forma posicionada com rotação otimizada
```

**Logs esperados:**
```
[DXF Parser] Ficheiro parseado com sucesso: {entities: 1, blocks: 2, layers: 1}
[DXF Extract] A processar 1 entidades
[DXF Extract] Tipos de entidades encontrados: POLYLINE: 1
[entityToPath] POLYLINE com 66 pontos
[DXF Paths] Extraídos 1 paths com sucesso, 0 falharam
[Polygon Nesting] Colocados 1 polígonos em 1 painéis
[Polygon Nesting] Utilização: 45.2%
```

---

## Algoritmo de Nesting de Polígonos

### Como Funciona
1. **Normalização**: Formas são ajustadas para origem (0,0)
2. **Ordenação**: Maiores áreas primeiro (estratégia gulosa)
3. **Rotações**: Testa 0°, 90°, 180°, 270° para cada peça
4. **Grade de Posições**: Testa posições em steps de 10mm
5. **Detecção de Colisão**: Verifica bounding boxes + kerf
6. **Alocação**: Coloca quando não houver sobreposição

### Limitações Atuais
- Rotação apenas em 90° (não rotação livre)
- Detecção de colisão simplificada (usa bounding boxes)
- Algoritmo guloso (não garante solução ótima global)

### Melhorias Futuras Planejadas
- Rotação livre (qualquer ângulo)
- Detecção de colisão precisa (polígono-polígono)
- Algoritmos avançados (genético, simulated annealing)
- Preview de todos os painéis (não só o 1º)

---

## Formato JSON Alternativo

Agora também suporta polígonos em JSON:

```json
[
  {
    "polygon": [
      [0, 0],
      [100, 0],
      [100, 50],
      [50, 100],
      [0, 50]
    ],
    "height": 50,
    "quantity": 5,
    "foamTypeId": "1",
    "label": "Forma Pentágono"
  }
]
```

### Campos JSON (Polígonos):
- `polygon` (obrigatório) - Array de pontos [x, y]
- `height` (opcional) - Espessura em mm (padrão: 50)
- `quantity` (opcional) - Quantidade (padrão: 1)
- `foamTypeId` (opcional) - ID do tipo de espuma
- `label` (opcional) - Nome/descrição da peça

---

## Troubleshooting

### Problema: "Modo Polígonos não disponível"
**Causa**: DXF só contém retângulos ou não tem geometria válida
**Solução**: Verifique se DXF tem POLYLINEs, SPLINEs, ou CIRCLEs

### Problema: "Utilização muito baixa (< 30%)"
**Causa**: Formas irregulares desperdiçam mais material que retângulos
**Solução**: 
- Normal para formas muito irregulares
- Tente rotações manuais
- Considere múltiplas peças por painel

### Problema: "Peças não cabem no painel"
**Causa**: Kerf + margem muito grandes, ou peça maior que painel
**Solução**:
- Reduza kerf/margem
- Use painel maior
- Divida peça em partes menores

### Problema: "Formas se sobrepõem na visualização"
**Causa**: Bug na detecção de colisão (reportar!)
**Solução**:
- Aumente kerf temporariamente
- Use modo Retângulos como fallback
- Reporte no suporte com ficheiro DXF

---

## Console de Debug (Avançado)

Abra a consola do navegador (F12) para ver logs detalhados:

```
[DXF Parser] Ficheiro parseado com sucesso: { entities: 45, blocks: 2, layers: 3 }
[DXF Extract] A processar 45 entidades
[DXF Extract] Tipos de entidades encontrados: LWPOLYLINE: 12, LINE: 30, CIRCLE: 3
[entityToPath] POLYLINE com 66 pontos
[DXF Paths] Extraídos 45 paths com sucesso, 0 falharam
[Polygon Nesting] Colocados 15 polígonos em 2 painéis
[Polygon Nesting] Utilização: 67.8%
```

Estes logs ajudam a identificar exatamente onde o processo está a falhar.

---

## Painel de Debug Interativo

No modal de Nesting, clique em "📊 Informações de Debug" para ver:

- **Formato**: DXF/JSON
- **Entidades**: Número de objetos no ficheiro
- **Layers**: Camadas encontradas
- **Paths Extraídos**: Formas convertidas
- **Peças Detetadas**: Lista com dimensões
- **Bounding Box**: Limites do desenho

---

## Comparação: Retângulos vs Polígonos

| Aspecto | Retângulos | Polígonos |
|---------|-----------|-----------|
| **Velocidade** | ⚡ Muito rápido | 🐢 Mais lento |
| **Aproveitamento** | 📊 Ótimo para retângulos | 📊 Melhor para formas irregulares |
| **Complexidade** | 🟢 Simples | 🟡 Médio |
| **Rotação** | ✅ Automática | ✅ Automática (90°) |
| **Precisão** | ✅ Exata | ⚠️ Aproximada (bbox) |
| **Uso Recomendado** | Peças retangulares | Formas complexas/orgânicas |

---

## Suporte

Se continuar com problemas:
1. ✅ Verifique logs na consola (F12)
2. ✅ Use o painel "Informações de Debug"
3. ✅ Teste com formato JSON alternativo
4. ✅ Contacte suporte com:
   - Screenshot do erro
   - Logs da consola
   - Ficheiro DXF problemático
   - Descrição do resultado esperado

---

## Changelog

### v2.0 - Nesting de Formas Irregulares ⭐
- ✅ Suporte completo para polígonos irregulares
- ✅ Algoritmo de nesting baseado em formas reais
- ✅ Rotação automática (0°, 90°, 180°, 270°)
- ✅ Detecção de colisões entre polígonos
- ✅ Modo de seleção: Retângulos / Polígonos
- ✅ Visualização melhorada com formas reais
- ✅ Painel de debug interativo
- ✅ Logs detalhados para diagnóstico

### v1.0 - Nesting de Retângulos
- ✅ Suporte para retângulos via bounding box
- ✅ Deteção automática de LWPOLYLINE
- ✅ Packing guilhotina simples
- ✅ Visualização de 1º painel
