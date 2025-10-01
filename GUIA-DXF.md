# Guia de Exportação DXF

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
- **LWPOLYLINE** - Polilinhas leves (recomendado para retângulos)
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

## Deteção Automática de Retângulos

O sistema tenta detetar retângulos automaticamente a partir de:

1. **LWPOLYLINE/POLYLINE fechadas** com 4 vértices
2. **4 LINEs** que formam um retângulo fechado
3. **Blocos (INSERT)** - dimensões do bounding box
4. **CIRCLE/ELLIPSE** - bounding box circular/elíptico

### Se não detetar retângulos:

1. **Visualização**: O desenho será mostrado mesmo sem deteção de retângulos
2. **Seleção Manual**: Arraste no desenho para selecionar áreas manualmente
3. **Alternativa JSON**: Use formato JSON com dimensões exatas

---

## Formato JSON Alternativo

Se o DXF não funcionar como esperado, use JSON:

```json
[
  {
    "length": 500,
    "width": 300,
    "height": 50,
    "quantity": 10,
    "foamTypeId": "1",
    "label": "Peça A"
  },
  {
    "length": 800,
    "width": 400,
    "height": 100,
    "quantity": 5,
    "foamTypeId": "2",
    "label": "Peça B"
  }
]
```

### Campos JSON:
- `length` (obrigatório) - Comprimento em mm
- `width` (obrigatório) - Largura em mm  
- `height` (opcional) - Espessura em mm (padrão: 50)
- `quantity` (opcional) - Quantidade (padrão: 1)
- `foamTypeId` (opcional) - ID do tipo de espuma
- `label` (opcional) - Nome/descrição da peça

---

## Troubleshooting

### Problema: "Este DXF está em formato binário"
**Solução**: Re-exporte o DXF como **ASCII**. Em AutoCAD: Options → Open and Save → DXF Options → ASCII

### Problema: "Nenhuma geometria foi detetada"
**Possíveis causas**:
1. O DXF contém apenas texto, cotas ou outros elementos não-geométricos
2. As entidades estão em blocos não referenciados
3. O DXF está corrompido

**Soluções**:
1. Verifique se o desenho contém linhas/polígonos visíveis
2. Execute `PURGE` no AutoCAD para limpar blocos não utilizados
3. Tente exportar novamente em versão diferente (R12 ou R2000)

### Problema: "Formas irregulares não aparecem"
**Diagnóstico**:
1. Abra a consola do navegador (F12)
2. Procure logs com `[DXF Parser]`, `[DXF Extract]`, `[DXF Paths]`
3. Verifique quais tipos de entidades foram encontrados
4. Use o painel "Informações de Debug" no modal

**Soluções**:
1. Simplifique as formas complexas (explode splines → polylines)
2. Use seleção manual no desenho visualizado
3. Forneça dimensões via JSON

### Problema: "Paths extraídos mas sem peças detetadas"
**Causa**: O sistema consegue visualizar mas não identificar retângulos automaticamente

**Solução**: Use a seleção manual arrastando no desenho mostrado

---

## Dicas para Melhor Compatibilidade

1. **Simplifique antes de exportar**
   - Remova layers desnecessários
   - Delete texto, cotas e hachuras
   - Mantenha apenas geometria essencial

2. **Use LWPOLYLINE para retângulos**
   - Mais eficiente que LINEs individuais
   - Melhor deteção automática

3. **Defina Units corretas**
   - Sistema assume milímetros (mm)
   - Certifique-se que o desenho está em mm

4. **Evite transformações complexas**
   - Blocos com rotação/escala podem causar problemas
   - `EXPLODE` blocos antes de exportar se necessário

5. **Teste em camadas**
   - Exporte layer por layer se tiver problemas
   - Combine depois no JSON se necessário

---

## Console de Debug (Avançado)

Abra a consola do navegador (F12) para ver logs detalhados:

```
[DXF Parser] Ficheiro parseado com sucesso: { entities: 45, blocks: 2, layers: 3 }
[DXF Extract] A processar 45 entidades
[DXF Extract] Tipos de entidades encontrados: LWPOLYLINE: 12, LINE: 30, CIRCLE: 3
[DXF Extract] Total de peças extraídas: 15
[DXF Paths] A extrair paths de 45 entidades
[DXF Paths] Extraídos 45 paths com sucesso, 0 falharam
```

Estes logs ajudam a identificar exatamente onde o processo está a falhar.

---

## Suporte

Se continuar com problemas:
1. Verifique logs na consola (F12)
2. Use o painel "Informações de Debug"
3. Teste com formato JSON alternativo
4. Contacte suporte com:
   - Screenshot do erro
   - Logs da consola
   - Ficheiro DXF problemático (se possível)
