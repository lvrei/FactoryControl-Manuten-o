# Correção: Auto-Refresh Pausando Modal de Nesting

## Problema Reportado

Na página de Produção (ProductionNew), ao abrir o modal "Nova OP (nesting)", após alguns segundos (30s) a página fazia refresh automático e perdia toda a configuração que estava sendo feita.

## Causa Raiz

No arquivo `client/pages/ProductionNew.tsx`, havia um `setInterval` que atualizava os dados a cada 30 segundos:

```typescript
useEffect(() => {
  loadData();
  const interval = setInterval(loadData, 30000); // ❌ Refresh a cada 30s
  return () => clearInterval(interval);
}, []); // ❌ Sem dependências
```

### Por Que Causava o Problema

1. **Interval ativo sempre**: O `setInterval` continuava executando mesmo com modais abertos
2. **Re-render forçado**: O `loadData()` atualizava estados (`productionOrders`, `machines`, etc)
3. **Perda de contexto**: Re-render podia causar fechamento/reset de modais filho
4. **UX ruim**: Usuário perdia trabalho em progresso após 30s

## Solução Implementada

Modificar o `useEffect` para **pausar o auto-refresh** quando qualquer modal estiver aberto:

```typescript
useEffect(() => {
  loadData();
  
  // Pausar auto-refresh quando qualquer modal está aberto
  const hasModalOpen = showNesting || showOrderForm || showSheetsManager || showChat;
  
  if (hasModalOpen) {
    console.log('⏸️  Auto-refresh pausado (modal aberto)');
    return; // ✅ Não criar interval se houver modal aberto
  }
  
  const interval = setInterval(loadData, 30000);
  console.log('▶��  Auto-refresh ativo (30s)');
  return () => {
    clearInterval(interval);
    console.log('⏹️  Auto-refresh limpo');
  };
}, [showNesting, showOrderForm, showSheetsManager, showChat]); // ✅ Dependências corretas
```

### Como Funciona Agora

1. **Modal fechado**: Auto-refresh ativo (30s)
2. **Modal aberto**: Auto-refresh **pausado** automaticamente
3. **Modal fechado**: Auto-refresh **retomado** automaticamente
4. **Logs no console**: Mostra quando pausa/retoma (debugging)

### Estados Monitorados

- `showNesting` - Modal de nesting (DXF/JSON)
- `showOrderForm` - Formulário de criação/edição de OP
- `showSheetsManager` - Gestor de folhas de produto
- `showChat` - Chat de produção

## Testes Realizados

### ✅ Teste 1: Modal de Nesting
1. Abrir modal "Nova OP (nesting)"
2. Carregar ficheiro DXF
3. Aguardar > 30 segundos
4. **Resultado**: Configuração mantida, sem refresh

### ✅ Teste 2: Múltiplos Modais
1. Abrir modal de nesting
2. Fechar e abrir formulário de OP
3. Aguardar > 30 segundos
4. **Resultado**: Sem refresh em ambos os casos

### ✅ Teste 3: Retoma de Auto-Refresh
1. Fechar todos os modais
2. Aguardar 30 segundos
3. **Resultado**: Auto-refresh retoma normalmente

## Outras Páginas com Auto-Refresh

### Potenciais Problemas Similares

| Página | Interval | Status | Requer Correção? |
|--------|----------|--------|------------------|
| **ProductionNew.tsx** | 30s | ✅ **Corrigido** | ✅ Feito |
| OperatorPortal.tsx | 3s, 5s | ⚠️ Múltiplos | 🔍 Investigar |
| Alerts.tsx | 30s | ⚠️ Pode ter modais | 🔍 Investigar |
| AlertsSimple.tsx | 10s, 30s | ⚠️ Pode ter modais | 🔍 Investigar |
| ProductionChat.tsx | 5s | ✅ Só mensagens | ❌ Não |
| ProtectedRoute.tsx | 30s | ✅ Auth check | ❌ Não |

### Recomendações

Para outras páginas com auto-refresh e modais:

```typescript
// Pattern recomendado
useEffect(() => {
  loadData();
  
  const hasModalOpen = /* detectar modais abertos */;
  if (hasModalOpen) return; // Pausar
  
  const interval = setInterval(loadData, INTERVAL_MS);
  return () => clearInterval(interval);
}, [/* dependências incluindo estados de modais */]);
```

## Melhorias Futuras

### 🔧 Curto Prazo
- [ ] Aplicar correção similar em `OperatorPortal.tsx`
- [ ] Aplicar correção similar em `Alerts.tsx` / `AlertsSimple.tsx`
- [ ] Adicionar testes automatizados para este cenário

### 🚀 Médio Prazo
- [ ] Hook customizado `useSmartRefresh({ interval, pauseWhen: [...] })`
- [ ] Context global para detectar modais abertos
- [ ] Feedback visual de auto-refresh (ícone pulsante)

### 🌟 Longo Prazo
- [ ] WebSockets em vez de polling
- [ ] Service Worker para cache inteligente
- [ ] Otimização de re-renders (React.memo, useMemo)

## Logs de Debug

Com a correção, logs aparecem no console:

```
▶️  Auto-refresh ativo (30s)
⏸️  Auto-refresh pausado (modal aberto)
⏹️  Auto-refresh limpo
▶️  Auto-refresh ativo (30s)
```

Útil para diagnosticar comportamento.

## Impacto no Usuário

### Antes ❌
- Perdia configuração a cada 30s no modal
- Frustração ao ter que refazer trabalho
- Possível perda de ficheiros carregados

### Depois ✅
- Configuração preservada indefinidamente
- Workflow ininterrupto
- UX melhorada significativamente

## Performance

### Sem Impacto Negativo
- Auto-refresh ainda funciona quando necessário
- Pausar/retomar é instantâneo (sem overhead)
- Logs podem ser removidos em produção se necessário

### Possível Melhoria
- Dados podem ficar ligeiramente desatualizados durante uso de modais
- Solução: Refresh manual ao fechar modal (se necessário)

## Código Alterado

### Ficheiros Modificados
- `client/pages/ProductionNew.tsx` (linhas 157-161 → 157-172)

### Ficheiros Criados
- `CORRECAO-AUTO-REFRESH.md` (este documento)

## Conclusão

✅ **Problema resolvido com sucesso!**

O modal de nesting agora mantém a configuração indefinidamente, sem interferência do auto-refresh. A solução é limpa, performática e facilmente extensível para outros componentes.

**Próximo passo**: Testar com o usuário e aplicar pattern similar em outras páginas se necessário.
