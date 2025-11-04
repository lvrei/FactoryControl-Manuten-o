# Solução Aplicada para Problema de Equipamentos

## IDs Críticos
- **Netlify Site**: 9975113b-154f-4b83-a271-b2f273964965
- **Neon Project**: dawn-glitter-94042096
- **URL**: https://maintenancecontrol.netlify.app

## Problema Original
- Frontend chamava `/api/equipment` mas recebia 404
- `/api/machines` funcionava corretamente
- Equipamentos não apareciam na página Equipment

## Solução Implementada

### 1. Frontend atualizado para usar `/api/machines`
**Ficheiro**: `client/pages/Equipment.tsx`

Mudanças:
```typescript
// Linha 93: GET equipment
- const response = await fetch("/api/equipment");
+ const response = await fetch("/api/machines");

// Linhas 119-120: POST/PUT equipment  
- const url = editingEquipment
-   ? `/api/equipment/${editingEquipment.id}`
-   : "/api/equipment";
+ const url = editingEquipment
+   ? `/api/machines/${editingEquipment.id}`
+   : "/api/machines";
```

### 2. Corrigido erro de undefined.icon
**Ficheiro**: `client/pages/Equipment.tsx` (linha 273)

```typescript
// Antes - causava erro quando status não estava no config
const statusInfo = statusConfig[eq.status];

// Depois - fallback para inactive se status desconhecido
const statusInfo = statusConfig[eq.status] || statusConfig.inactive;
```

### 3. Adicionados novos estados ao statusConfig
**Ficheiro**: `client/pages/Equipment.tsx` (linhas 55-60)

```typescript
const statusConfig = {
  active: { label: "Ativo", color: "bg-green-600", icon: CheckCircle },
  available: { label: "Disponível", color: "bg-green-600", icon: CheckCircle }, // NOVO
  maintenance: { label: "Manutenção", color: "bg-orange-600", icon: Settings },
  busy: { label: "Em Uso", color: "bg-blue-600", icon: Settings }, // NOVO
  inactive: { label: "Inativo", color: "bg-gray-600", icon: AlertTriangle },
};
```

## Estado do Deploy

⚠️ **Deploy está a falhar com erro 500**

Tentativas de deploy via MCP falharam com:
```
Error: Failed to deploy site: 500 Internal Server Error
```

**Próximo Passo**: Deploy manual via UI do Netlify ou verificar logs de build

## Como Verificar se Funcionou

1. Aceder a https://maintenancecontrol.netlify.app/equipment
2. Deve carregar 4 equipamentos:
   - BZM-01 (status: available)
   - CNC-01 (status: maintenance)  
   - Carrossel-01 (status: busy)
   - Pré-CNC-01 (status: available)

## Código da API que Funciona

`/api/machines` retorna:
```json
[
  {
    "id": "bzm-001",
    "name": "BZM-01",
    "type": "BZM",
    "status": "available",
    "maxDimensions": {"length": 4200, "width": 2000, "height": 2000},
    "cuttingPrecision": 1,
    "currentOperator": null,
    "lastMaintenance": "2025-10-22T17:11:11.812Z",
    "operatingHours": 1250,
    "specifications": "Corte Inicial"
  },
  ...
]
```

## Ficheiros Modificados
1. ✅ `client/pages/Equipment.tsx` - Mudado para /api/machines + statusConfig
2. ✅ `netlify.toml` - Revertido (sem mudanças)
3. ⏳ Deploy pendente devido a erro 500

## Se o Deploy Falhar
1. Fazer push manual para git
2. Fazer deploy via Netlify UI
3. Ou verificar logs de build do Netlify para ver erro específico
