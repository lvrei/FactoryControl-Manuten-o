# Problema: Rotas /api/equipment e /api/users não funcionam no Netlify

## Contexto
- **Site Netlify ID**: 9975113b-154f-4b83-a271-b2f273964965
- **URL**: https://maintenancecontrol.netlify.app
- **Neon Project ID**: dawn-glitter-94042096
- **DATABASE_URL**: Configurado corretamente no Netlify

## Sintomas
1. `/api/machines` **FUNCIONA** ✓ - Retorna JSON com dados das máquinas
2. `/api/equipment` **NÃO FUNCIONA** ✗ - Retorna HTML: "Cannot GET /api/equipment"
3. `/api/users` **NÃO FUNCIONA** ✗ - Retorna HTML: "Cannot GET /api/users"
4. `/api/ping` **FUNCIONA** ✓
5. `/api/db-status` **FUNCIONA** ✓ - Confirma que DB está conectada

## O que já foi tentado

### 1. Criadas tabelas na BD Neon ✓
```sql
CREATE TABLE machines (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT, status TEXT, ...);
CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL, ...);
```

### 2. Corrigido redirect do Netlify ✓
`netlify.toml`:
```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"  # Era /api/api/:splat antes
```

### 3. Tornado createServer() assíncrono ✓
`server/index.ts`:
```typescript
export async function createServer() {
  const app = express();
  // ... rotas carregadas com await
}
```

### 4. Adicionadas rotas diretas em server/index.ts ✗
Mesmo adicionando rotas diretas ANTES de todos os routers, `/api/equipment` e `/api/users` continuam a não funcionar.

## Observações Críticas

1. **Todas as rotas estão no mesmo ficheiro** (`server/routes/production.ts`) e no mesmo router (`productionRouter`)
2. **`/api/machines` funciona mas `/api/equipment` não** - Isto é muito estranho porque ambas usam o mesmo padrão
3. **O erro é HTML do Express**, não do Netlify - Isto significa que o pedido chega ao Express mas ele não encontra a rota
4. **Adicionei rotas diretas em `server/index.ts` linha 105-165** mas continuam a não funcionar

## Código Atual

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

### server/index.ts (linhas 104-165)
```typescript
// Direct equipment endpoint (for testing)
app.get("/api/equipment", async (_req, res) => {
  try {
    console.log("Direct /api/equipment route called");
    if (!isDbConfigured()) {
      return res.json([]);
    }
    const { rows } = await query(`SELECT id, name, type as equipment_type, status, created_at FROM machines ORDER BY name`);
    res.json(rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      equipment_type: r.equipment_type || "",
      status: r.status,
      created_at: r.created_at,
    })));
  } catch (e: any) {
    console.error("GET /api/equipment error", e);
    res.status(500).json({ error: e.message });
  }
});
// ... (POST /api/equipment, GET/POST /api/users seguem o mesmo padrão)
```

## Hipóteses

1. **Problema com serverless-http**: Pode não estar a processar corretamente certos paths
2. **Conflito de rotas**: Algum middleware ou router posterior pode estar a sobrescrever as rotas
3. **Problema de compilação**: O código compilado pode estar diferente do fonte
4. **Ordem de registro**: As rotas podem precisar de ser registradas numa ordem específica

## Próximas Ações a Tentar

1. Verificar os logs do Netlify Functions para ver se os logs de debug aparecem
2. Tentar usar um path completamente diferente (ex: `/api/v1/equipment`) para testar se é um problema com o path específico
3. Verificar se há algum middleware que bloqueia esses paths específicos
4. Tentar criar uma função serverless separada só para equipment e users
5. Usar middleware de logging para ver qual é o path exato que chega ao Express

## Informação de Diagnóstico

```bash
# Testar as rotas
curl https://maintenancecontrol.netlify.app/api/machines      # ✓ Funciona
curl https://maintenancecontrol.netlify.app/api/equipment     # ✗ "Cannot GET /api/equipment"
curl https://maintenancecontrol.netlify.app/api/users         # ✗ "Cannot GET /api/users"
curl https://maintenancecontrol.netlify.app/api/db-status     # ✓ {"configured":true,"connected":true}
```

## Deploy Atual
- Deploy ID: 68f911626f75ed01a995d352
- Estado: Ready
- URL: https://maintenancecontrol.netlify.app
