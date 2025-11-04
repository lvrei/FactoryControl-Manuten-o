# Estado Atual do Problema - Equipment e Users API 404

## IDs Importantes
- **Netlify Site ID**: 9975113b-154f-4b83-a271-b2f273964965
- **Netlify URL**: https://maintenancecontrol.netlify.app
- **Neon Project ID**: dawn-glitter-94042096
- **Último Deploy ID conhecido**: 68f911626f75ed01a995d352

## Problema Principal
- `/api/equipment` → Retorna 404 ("Cannot GET /api/equipment")
- `/api/users` → Retorna 404 ("Cannot GET /api/users")
- `/api/machines` → ✅ Funciona corretamente
- `/api/db-status` → ✅ Funciona (confirma DB conectada)

## Estado da Base de Dados
- ✅ Tabela `machines` criada com 4 equipamentos
- ✅ Tabela `users` criada
- ✅ DATABASE_URL configurado no Netlify
- ✅ Conexão Neon funciona

## Estado do Código

### Rotas Definidas
1. **server/routes/production.ts** (linhas 984-1039)
   - GET/POST `/equipment` (alias para /machines)
   - GET/POST `/users`

2. **server/index.ts** (linhas 105-191)
   - GET/POST `/api/equipment` (rotas diretas adicionadas)
   - GET/POST `/api/users` (rotas diretas adicionadas)

### Ficheiros Modificados
- `server/index.ts`: Tornado assíncrono, adicionadas rotas diretas, logging
- `netlify/functions/api.ts`: Handler simplificado com cache
- `netlify.toml`: Corrigido redirect de `/api/api/:splat` para `/api/:splat`
- `client/pages/Equipment.tsx`: **ACABADO DE CORRIGIR** - erro de undefined.icon

## Últimas Tentativas
1. ✅ Rotas diretas em server/index.ts
2. ✅ Rotas sem prefixo /api
3. ✅ Logging extensivo
4. ✅ createServer() assíncrono
5. ❌ Nenhuma funcionou para /equipment e /users

## Teoria Atual
Possível conflito de rotas duplicadas ou ordem de carregamento incorreta.
O `productionRouter` tem as rotas mas algo as bloqueia ou sobrescreve.

## Próximo Passo
Verificar logs do Netlify Functions para ver:
- Se as rotas estão a ser carregadas
- Que path exato chega ao Express
- Se há erros durante o carregamento
