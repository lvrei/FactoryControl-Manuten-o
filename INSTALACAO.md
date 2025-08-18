# 🏭 FactoryControl - Sistema de Produção
## Instruções de Instalação e Configuração

### 📋 **Pré-requisitos**

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 18 ou superior) - [Download aqui](https://nodejs.org/)
- **npm** (vem com Node.js) ou **yarn** 
- **Git** (opcional, para versionamento)

### 📦 **1. Download do Projeto**

1. **Baixe o projeto:**
   - Clique no botão **[Download Project](#project-download)** na interface
   - Extraia o arquivo ZIP para uma pasta de sua escolha
   - Ex: `C:\FactoryControl\` ou `~/FactoryControl/`

### ⚙️ **2. Instalação das Dependências**

Abra o terminal/prompt de comando na pasta do projeto e execute:

```bash
# Instalar todas as dependências
npm install

# OU se preferir usar yarn
yarn install
```

**Nota:** A instalação pode demorar alguns minutos na primeira vez.

### 🚀 **3. Executar o Sistema**

#### **Modo Desenvolvimento (Recomendado para testes)**

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# O sistema estará disponível em:
# http://localhost:5173
```

#### **Modo Produção**

```bash
# 1. Fazer build do projeto
npm run build

# 2. Iniciar servidor de produção
npm start

# O sistema estará disponível em:
# http://localhost:3000
```

### 📱 **4. Acessar o Sistema**

#### **🏢 Backend - Gestão Administrativa**
- **URL:** `http://localhost:5173/production`
- **Funções:**
  - Criar/editar ordens de produção
  - Gestão de fichas técnicas
  - Chat com operadores
  - Controle de prioridades
  - Relatórios e estatísticas

#### **👷 Frontend - Portal do Operador**
- **URL:** `http://localhost:5173/operator`
- **Funções:**
  - Identificação por máquina
  - Lista de trabalho personalizada
  - Registro de progresso
  - Chat com escritório

#### **📊 Dashboard Principal**
- **URL:** `http://localhost:5173/`
- **Funções:**
  - Visão geral do sistema
  - Acesso a todos os módulos
  - Manutenção, qualidade, equipa, etc.

### 🔧 **5. Configuração Inicial**

#### **5.1 Configurar Máquinas**

O sistema vem com 4 máquinas pré-configuradas:
- **BZM-01:** Corte inicial de blocos
- **Carrossel-01:** Corte em coxins  
- **Pré-CNC-01:** Preparação para CNC
- **CNC-01:** Cortes precisos

**Para personalizar:** Edite o arquivo `client/services/productionService.ts` na seção `mockMachines`.

#### **5.2 Configurar Tipos de Espuma**

Tipos pré-configurados:
- **D20:** Densidade 20, uso geral
- **D28:** Densidade 28, móveis
- **D35:** Densidade 35, colchões

**Para adicionar mais:** Use a interface "Fichas Técnicas" no sistema.

#### **5.3 Testar Funcionalidades**

1. **Criar uma OP de teste:**
   - Acesse `/production`
   - Clique "Nova Ordem"
   - Preencha dados do cliente
   - Adicione linhas de produção
   - Configure operações de corte

2. **Testar portal do operador:**
   - Acesse `/operator`
   - Digite ID: `OP001`, Nome: `Teste Operador`
   - Selecione uma máquina
   - Inicie sessão de trabalho

### 🛠️ **6. Personalização**

#### **6.1 Alterar Logo/Marca**
- Substitua arquivos em `public/icons/`
- Edite `public/manifest.json` com dados da empresa

#### **6.2 Cores e Estilo**
- Edite `client/global.css` para cores personalizadas
- Ou configure em `tailwind.config.ts`

#### **6.3 Base de Dados**
Atualmente usa `localStorage` (navegador). Para produção:
- Substitua `client/services/productionService.ts`
- Conecte a base de dados real (MySQL, PostgreSQL, etc.)
- Implemente APIs REST ou GraphQL

### 📱 **7. Criar APK (Opcional)**

Para gerar aplicação móvel Android:

```bash
# Método 1: PhoneGap Build (Recomendado)
npm run create:zip
# Depois faça upload em https://build.phonegap.com/

# Método 2: Capacitor (Local - Requer Android Studio)
npm run build:apk
```

### 🔒 **8. Segurança e Produção**

#### **8.1 Variáveis de Ambiente**
Crie arquivo `.env` na raiz:

```env
# Configurações de produção
NODE_ENV=production
PORT=3000
DATABASE_URL=sua-base-dados
API_SECRET=sua-chave-secreta
```

#### **8.2 HTTPS em Produção**
- Configure certificado SSL
- Use proxy reverso (nginx, apache)
- Configure firewall adequado

### 🆘 **9. Resolução de Problemas**

#### **Erro: "Cannot find module"**
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

#### **Porta em uso**
```bash
# Usar porta diferente
npm run dev -- --port 3001
```

#### **Problemas de build**
```bash
# Verificar erros TypeScript
npm run typecheck

# Build com logs detalhados
npm run build:client -- --debug
```

### 📞 **10. Suporte**

#### **Logs do Sistema**
- Logs aparecem no console do navegador (F12)
- Terminal mostra logs do servidor

#### **Base de Dados**
- Dados salvos em `localStorage` do navegador
- Para limpar: F12 → Application → Local Storage → Clear

#### **Estrutura de Arquivos Importantes**

```
FactoryControl/
├── client/
│   ├── pages/
│   │   ├── ProductionNew.tsx      # Sistema principal
│   │   ├── OperatorPortal.tsx     # Portal operadores
│   │   └── ...
│   ├── components/production/     # Componentes específicos
│   ├── services/
│   │   └── productionService.ts   # Lógica de negócio
│   └── types/
│       └── production.ts          # Tipos TypeScript
├── public/                        # Arquivos estáticos
├── package.json                   # Dependências
└── README.md                      # Documentação
```

---

## 🎯 **Começar Rapidamente**

```bash
# 1. Extrair projeto para pasta
cd FactoryControl

# 2. Instalar dependências
npm install

# 3. Iniciar sistema
npm run dev

# 4. Abrir navegador
# http://localhost:5173/production
```

**Sistema pronto para usar! 🚀**

---

**Documentação completa:** `SISTEMA-PRODUCAO.md`
**APK Android:** `APK-RAPIDO.md` e `INSTALAR-APK.md`
