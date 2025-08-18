# Sistema de Produção - Corte de Espuma

## Visão Geral
Sistema completo para gestão de produção específico para indústria de corte de espuma, com workflow que vai desde blocos de 40m até produtos finais cortados.

## Funcionalidades Implementadas

### 🏭 **Backend - Gestão Administrativa**

#### **1. Fichas Técnicas de Produtos**
- Cadastro de tipos de espuma (D20, D28, D35, etc.)
- Referências internas personalizadas
- Dimensões padrão por produto
- Upload de documentos e fotos
- Especificações técnicas detalhadas

#### **2. Criação de Ordens de Produção (OP)**
- Número de OP automático ou manual
- Dados do cliente e prazo de entrega
- **Múltiplas linhas por OP:**
  - Tipo de espuma específico
  - Dimensões iniciais (bloco de entrada)
  - Dimensões finais (produto cortado)
  - Quantidades por linha
- **Operações de corte por linha:**
  - Sequência de máquinas (BZM → Carrossel → Pré-CNC → CNC)
  - Dimensões de entrada e saída em cada máquina
  - Tempo estimado por operação
  - Quantidades específicas por operação

#### **3. Gestão de Prioridades**
- Sistema de prioridades dinâmico (Baixa/Média/Alta/Urgente)
- Botões para aumentar/diminuir prioridade
- Sinalização visual no frontend para operadores
- Ordenação automática por prioridade

#### **4. Controle de Status**
- Status da OP: Criada → Em Andamento → Concluída → Cancelada
- Controle individual por linha de produção
- Progresso em tempo real das operações
- Histórico de alterações

### 📱 **Frontend - Portal do Operador**

#### **1. Identificação do Operador**
- Login com ID e nome do operador
- Seleção da máquina de trabalho
- Verificação de disponibilidade das máquinas
- Início/fim de sessão de trabalho

#### **2. Lista de Trabalho Personalizada**
- Trabalhos filtrados por máquina específica
- Ordenação automática por prioridade
- Filtros por:
  - Prioridade (Alta/Média/Baixa)
  - Número da OP
  - Cliente
  - Tipo de espuma
- Informações detalhadas:
  - Dimensões de entrada e saída
  - Quantidades restantes
  - Tempo estimado
  - Data de entrega
  - Cliente e tipo de espuma

#### **3. Registro de Progresso**
- Conclusão parcial ou total de operações
- Input de quantidades concluídas
- Atualização em tempo real do progresso
- Remoção automática de itens concluídos

### 💬 **Sistema de Chat**

#### **Backend ↔ Frontend**
- Chat direcionado por máquina ou operador
- Mensagens em tempo real
- Notificações de mensagens não lidas
- Histórico de conversas
- Envio de instruções específicas para OPs

### 🎯 **Fluxo de Trabalho da Fábrica**

#### **Processo Típico:**
1. **Entrada:** Bloco de espuma 40m x 2m x 2m
2. **BZM:** Corte inicial em blocos menores
3. **Destino A:** Direto para camião (cliente)
4. **Destino B:** Carrossel para corte em coxins
5. **Destino C:** Linha CNC (Pré-CNC → CNC) para formatos específicos

#### **Configuração por OP:**
- Cada linha define o caminho específico
- Operações sequenciais configuráveis
- Máquinas específicas por operação
- Tempos estimados por etapa

## Como Usar o Sistema

### **Para Administradores (Backend):**

1. **Acesse:** `/production`
2. **Criar Fichas Técnicas:**
   - Clique em "Fichas Técnicas"
   - Cadastre tipos de espuma
   - Adicione documentos e fotos

3. **Criar Nova OP:**
   - Clique em "Nova Ordem"
   - Preencha dados básicos (cliente, prazo)
   - Adicione linhas de produção
   - Configure operações de corte para cada linha
   - Selecione máquinas e sequência

4. **Gestão de Prioridades:**
   - Use setas ↑↓ para alterar prioridades
   - Monitore OPs urgentes
   - Envie mensagens para operadores

### **Para Operadores:**

1. **Acesse:** `/operator`
2. **Identifique-se:**
   - Digite seu ID e nome
   - Selecione sua máquina
   - Inicie sessão de trabalho

3. **Execute Trabalhos:**
   - Veja lista priorizada para sua máquina
   - Consulte dimensões e especificações
   - Registre quantidades concluídas
   - Use chat para comunicação

## Estrutura de Dados

### **Ordem de Produção:**
```typescript
interface ProductionOrder {
  orderNumber: string;     // OP-20240101-001
  customer: Cliente;       // Dados do cliente
  expectedDeliveryDate: string;
  lines: ProductionOrderLine[];  // Múltiplas linhas
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'created' | 'in_progress' | 'completed';
}
```

### **Linha de Produção:**
```typescript
interface ProductionOrderLine {
  foamType: FoamType;           // D20, D28, D35
  initialDimensions: Dimensions; // 40000x2000x2000mm
  finalDimensions: Dimensions;   // 1000x500x200mm
  quantity: number;             // 100 unidades
  cuttingOperations: CuttingOperation[]; // BZM → Carrossel → CNC
}
```

### **Operação de Corte:**
```typescript
interface CuttingOperation {
  machineId: string;        // "BZM-01"
  inputDimensions: Dimensions;
  outputDimensions: Dimensions;
  quantity: number;
  estimatedTime: number;    // minutos
  status: 'pending' | 'in_progress' | 'completed';
}
```

## Máquinas Configuradas

1. **BZM-01:** Corte inicial de blocos grandes
2. **Carrossel-01:** Corte em coxins
3. **Pré-CNC-01:** Preparação para CNC
4. **CNC-01:** Cortes precisos e formatos específicos

## Benefícios Implementados

✅ **Rastreabilidade completa** do bloco inicial ao produto final
✅ **Gestão de prioridades** em tempo real
✅ **Comunicação direta** escritório ↔ chão de fábrica
✅ **Edição flexível** de OPs mesmo após criação
✅ **Progresso visual** para operadores
✅ **Filtros inteligentes** por máquina
✅ **Cálculo automático** de volumes e custos
✅ **Interface responsiva** para tablets/móveis

## Próximos Passos

1. **Teste o sistema** com OPs reais
2. **Ajuste as máquinas** conforme sua configuração
3. **Treine operadores** no portal
4. **Configure notificações** personalizadas
5. **Integre com sistema ERP** existente se necessário

O sistema está pronto para produção e pode ser expandido conforme suas necessidades específicas!
