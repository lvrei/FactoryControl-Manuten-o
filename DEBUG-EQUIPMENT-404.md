# Problema Crítico: /api/equipment e /api/users retornam 404

## Estado Atual (após múltiplas tentativas)

### O que funciona ✅
- `/api/machines` → Retorna dados da tabela `machines` corretamente
- `/api/db-status` → Confirma que a DB está conectada
- `/api/ping` → Funciona
- SQL direto na DB → Confirma que existem 4 equipamentos na tabela `machines`

### O que NÃO funciona ❌
- `/api/equipment` → "Cannot GET /api/equipment"
- `/api/users` → "Cannot GET /api/users"

## Tentativas Realizadas

1. ✅ Criadas tabelas `machines` e `users` na base de dados Neon
2. ✅ Corrigido redirect do Netlify em `netlify.toml` (era `/api/api/` agora é `/api/`)
3. ✅ Tornado `createServer()` assíncrono para carregar rotas sequencialmente
4. ✅ Adicionadas rotas sem prefixo `/api` (ex: `/equipment`) pensando que Netlify remove o prefixo
5. ✅ Adicionadas rotas diretas em `server/index.ts` ANTES de carregar qualquer router
6. ✅ Adicionado logging extensivo
7. ❌ Nada funcionou!

## Observações Importantes

1. **Rotas existem**: As rotas `/equipment` e `/users` estão definidas em `server/routes/production.ts` (linhas 984-1039)
2. **Mesmo router**: Tanto `/machines` (que funciona) como `/equipment` (que não funciona) estão no MESMO `productionRouter`
3. **Erro do Express**: "Cannot GET /api/equipment" vem do Express, não do Netlify - o pedido chega ao Express!
4. **Rotas diretas**: Adicionei rotas diretas em `server/index.ts` (linhas 105-191) MAS AINDA ASSIM NÃO FUNCIONAM!

## Código Relevante

### netlify/functions/api.ts
```typescript
import serverless from "serverless-http";
import { createServer } from "../../server";

let cachedHandler: any = null;

export const handler = async (event: any, context: any) => {
  console.log("Handler invoked:", event.path, event.httpMethod);
  
  if (!cachedHandler) {
    console.log("Creating new server instance...");
    const app = await createServer();
    console.log("Server created, routes should be registered");
    cachedHandler = serverless(app);
  }
  
  const result = await cachedHandler(event, context);
  console.log("Handler result status:", result.statusCode);
  return result;
};
```

### server/index.ts (linhas 105-157 - rotas diretas)
```typescript
  // Equipment routes - DIRECT IMPLEMENTATION BEFORE ROUTERS
  app.get("/api/equipment", async (_req, res) => {
    console.log("[DIRECT] GET /api/equipment called");
    try {
      if (!isDbConfigured()) {
        console.log("[DIRECT] DB not configured, returning empty array");
        return res.json([]);
      }
      const { rows } = await query(`SELECT id, name, type as equipment_type, status, created_at FROM machines ORDER BY name`);
      console.log(`[DIRECT] Found ${rows.length} equipment items`);
      res.json(rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        equipment_type: r.equipment_type || "",
        status: r.status,
        created_at: r.created_at,
      })));
    } catch (e: any) {
      console.error("[DIRECT] GET /api/equipment error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  // ... POST /api/equipment, GET/POST /api/users seguem o mesmo padrão
```

### server/routes/production.ts (linhas 984-1039)
```typescript
// Alias: /equipment -> /machines (for backward compatibility)
productionRouter.get("/equipment", async (req, res) => {
  try {
    if (!isDbConfigured()) {
      return res.json([]);
    }
    const { rows } = await query(`SELECT
      id, name, type as equipment_type, '' as manufacturer, '' as model,
      '' as serial_number, created_at as installation_date, '' as location,
      status, '' as notes, created_at
      FROM machines ORDER BY name`);
    res.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      equipment_type: r.equipment_type || "",
      // ... resto dos campos
    })));
  } catch (e: any) {
    console.error("GET /equipment error", e);
    res.status(500).json({ error: e.message });
  }
});
```

## Teorias

1. **Middleware bloqueando**: Algum middleware está a consumir o pedido antes de chegar às rotas
2. **Problema com serverless-http**: A biblioteca pode não estar a processar corretamente certos paths
3. **Ordem de registro**: As rotas podem estar a ser sobrescritas por algo carregado depois
4. **Problema com Netlify**: O redirect pode estar a fazer algo inesperado com paths específicos

## Próximos Passos a Tentar

1. ❓ Verificar os logs do Netlify Functions para ver se os logs de debug aparecem
2. ❓ Adicionar um middleware catch-all para ver EXATAMENTE o que chega ao Express
3. ❓ Criar uma função Netlify separada só para equipment/users
4. ❓ Testar localmente com serverless-offline para ver se reproduz o problema
5. ❓ Verificar se há algum CORS ou security middleware bloqueando

## Testes para Fazer

```bash
# Funciona
curl https://maintenancecontrol.netlify.app/api/machines
# {"id":"mach-1","name":"DL50",...}

# Não funciona
curl https://maintenancecontrol.netlify.app/api/equipment
# Cannot GET /api/equipment

# Verificar DB
SQL: SELECT * FROM machines; 
# Retorna 4 registos ✓
```
