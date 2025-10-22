# 🔧 MaintenanceControl - Sistema de Gestão de Manutenção

## 📋 Visão Geral

O **MaintenanceControl** é um sistema completo de gestão de manutenção industrial, focado em equipamentos, planeamento de manutenções, gestão de stock de materiais e monitorização através de sensores e câmaras.

Este projeto foi criado a partir da transformação de um sistema de controlo de produção de espuma, mantendo apenas as funcionalidades relacionadas com manutenção e expandindo-as para qualquer tipo de indústria.

---

## 🚀 Deployment

### URLs do Projeto

- **🌐 Site Netlify**: https://maintenancecontrol.netlify.app
- **📊 Dashboard Netlify**: https://app.netlify.com/projects/maintenancecontrol
- **🗄️ Base de Dados Neon**: 
  - Project ID: `dawn-glitter-94042096`
  - Branch: `main` (ID: br-orange-frog-ae8r4v5m)
  - Database: `neondb`

### Variáveis de Ambiente Configuradas

```env
DATABASE_URL="postgresql://neondb_owner:npg_l4ZVxwMH8ODJ@ep-misty-salad-ae4iw1z8-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
JWT_SECRET="factory_control_jwt_secret_dev_change_in_production_2024"
JWT_REFRESH_SECRET="factory_control_refresh_secret_dev_change_in_production_2024"
VITE_SENTRY_DSN="https://ec182e1759fe758a96a6f7dd8923f044@o4510078992908288.ingest.de.sentry.io/4510079110152272"
SENTRY_DSN="https://ec182e1759fe758a96a6f7dd8923f044@o4510078992908288.ingest.de.sentry.io/4510079110152272"
```

⚠️ **Importante**: Estas variáveis devem ser configuradas também no Netlify para produção.

---

## 📱 Funcionalidades Principais

### 1. 📊 Dashboard
- Métricas em tempo real de equipamentos
- Estado dos equipamentos (Ativos, Em Manutenção, Inativos)
- Manutenções pendentes e atrasadas
- Alertas de stock baixo
- Alertas críticos e avisos
- Manutenções recentes e próximas

### 2. ⚙️ Equipamentos
- Criar equipamentos genéricos (não só espuma)
- Gestão de equipamentos por tipo, fabricante, modelo
- Números de série e localização
- Códigos QR para identificação rápida
- Estados: ativo, manutenção, inativo

### 3. 🔧 Manutenção
- Criar novas manutenções
- Checklist DL50 (mantido do sistema original)
- Relatórios de manutenção
- Histórico completo de manutenções
- Tipos: preventiva, corretiva, preditiva
- Prioridades e estados

### 4. 👥 Equipa
- Gestão de utilizadores
- Funções: administrador, técnico, operador
- Atribuição de manutenções

### 5. 📅 Planeamento
- Planeamento de manutenções futuras
- Calendário de manutenções
- Manutenções agendadas, em progresso, concluídas
- Alertas de manutenções atrasadas

### 6. 📡 Sensores
- Sensores associados a equipamentos
- Monitorização de temperatura, pressão, vibração, etc.
- Definição de limites mínimos e máximos
- Alertas automáticos quando ultrapassam limites

### 7. 📹 Câmaras
- Câmaras de vigilância associadas a equipamentos
- Deteção de anomalias (ROI - Region of Interest)
- Integração com sistema de alertas
- Histórico de eventos

### 8. 📦 Stock de Material (NOVO)
- Gestão completa de materiais e componentes
- Stock geral ou associado a equipamentos específicos
- Alertas de stock baixo e sem stock
- Categorias, unidades, fornecedores
- Custo por unidade e controlo de custos

### 9. 🚨 Alertas
- Alertas críticos e avisos
- Origem: sensores, câmaras, manutenções
- Estados: ativo, reconhecido, resolvido
- Integração com sistema de notificações

---

## 🗄️ Schema da Base de Dados

### Tabelas Principais

#### `equipments`
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR 255)
- equipment_type (VARCHAR 100)
- manufacturer (VARCHAR 255)
- model (VARCHAR 255)
- serial_number (VARCHAR 255 UNIQUE)
- installation_date (DATE)
- location (VARCHAR 255)
- status (VARCHAR 50) - 'active', 'maintenance', 'inactive'
- qr_code (TEXT)
- notes (TEXT)
- created_at, updated_at (TIMESTAMP)
```

#### `materials`
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR 255)
- code (VARCHAR 100 UNIQUE)
- category (VARCHAR 100)
- unit (VARCHAR 50)
- min_stock (INTEGER)
- current_stock (INTEGER)
- cost_per_unit (DECIMAL)
- supplier (VARCHAR 255)
- equipment_id (INTEGER) - FK to equipments
- is_general_stock (BOOLEAN)
- notes (TEXT)
- created_at, updated_at (TIMESTAMP)
```

#### `maintenance_records`
```sql
- id (SERIAL PRIMARY KEY)
- equipment_id (INTEGER) - FK to equipments
- maintenance_type (VARCHAR 100)
- description (TEXT)
- performed_by (INTEGER) - FK to users
- performed_at (TIMESTAMP)
- next_maintenance_date (DATE)
- status (VARCHAR 50)
- priority (VARCHAR 50)
- cost (DECIMAL)
- materials_used (TEXT)
- attachments (TEXT)
- notes (TEXT)
- created_at, updated_at (TIMESTAMP)
```

#### `planned_maintenance`
```sql
- id (SERIAL PRIMARY KEY)
- equipment_id (INTEGER) - FK to equipments
- maintenance_type (VARCHAR 100)
- description (TEXT)
- scheduled_date (DATE)
- assigned_to (INTEGER) - FK to users
- status (VARCHAR 50) - 'scheduled', 'in_progress', 'completed'
- priority (VARCHAR 50)
- estimated_duration (INTEGER)
- notes (TEXT)
- created_at, updated_at (TIMESTAMP)
```

#### `sensors`
```sql
- id (SERIAL PRIMARY KEY)
- equipment_id (INTEGER) - FK to equipments
- sensor_type (VARCHAR 100)
- name (VARCHAR 255)
- location (VARCHAR 255)
- threshold_min (DECIMAL)
- threshold_max (DECIMAL)
- unit (VARCHAR 50)
- is_active (BOOLEAN)
- last_reading (DECIMAL)
- last_reading_time (TIMESTAMP)
- created_at, updated_at (TIMESTAMP)
```

#### `cameras`
```sql
- id (SERIAL PRIMARY KEY)
- equipment_id (INTEGER) - FK to equipments
- name (VARCHAR 255)
- camera_url (TEXT)
- location (VARCHAR 255)
- is_active (BOOLEAN)
- detection_enabled (BOOLEAN)
- roi_config (JSONB)
- created_at, updated_at (TIMESTAMP)
```

#### `alerts`
```sql
- id (SERIAL PRIMARY KEY)
- equipment_id (INTEGER) - FK to equipments
- sensor_id (INTEGER) - FK to sensors
- camera_id (INTEGER) - FK to cameras
- alert_type (VARCHAR 100)
- severity (VARCHAR 50) - 'critical', 'warning', 'info'
- title (VARCHAR 255)
- description (TEXT)
- triggered_at (TIMESTAMP)
- resolved_at (TIMESTAMP)
- resolved_by (INTEGER) - FK to users
- status (VARCHAR 50) - 'active', 'resolved'
- created_at (TIMESTAMP)
```

---

## 🛠️ Stack Tecnológica

### Frontend
- **React 19.2** + **TypeScript 5.5**
- **Vite 6.2** - Build tool
- **React Router 6.26** - Roteamento
- **TanStack Query 5.56** - Gestão de estado e cache
- **Tailwind CSS 3.4** - Styling
- **Radix UI** - Componentes acessíveis
- **Lucide React** - Ícones
- **Recharts** - Gráficos
- **React Hook Form** - Formulários

### Backend
- **Express 4.18** - Framework Node.js
- **PostgreSQL** (Neon) - Base de dados
- **pg** - Cliente PostgreSQL
- **JWT** - Autenticação
- **bcryptjs** - Hashing de passwords
- **Helmet** - Segurança HTTP
- **CORS** - Cross-Origin Resource Sharing

### DevOps
- **Netlify** - Deployment e hosting
- **Neon** - PostgreSQL serverless
- **Sentry** - Error tracking
- **Capacitor** - Mobile (Android APK)

---

## 📂 Estrutura do Projeto

```
maintenancecontrol/
├── client/              # Frontend React
│   ├── components/      # Componentes reutilizáveis
│   │   ├─��� ui/         # Componentes UI base (Radix)
│   │   ├── equipment/  # Componentes de equipamentos
│   │   ├── maintenance/# Componentes de manutenção
│   │   └── ...
│   ├── pages/          # Páginas/Rotas principais
│   │   ├── Dashboard.tsx
│   │   ├── Equipment.tsx
│   │   ├── MaintenanceComplete.tsx
│   │   ├── MaterialStock.tsx
│   │   ├── Team.tsx
│   │   ├── Planning.tsx
│   │   ├── Sensors.tsx
│   │   ├── Cameras.tsx
│   │   └── AlertsSimple.tsx
│   ├── services/       # Serviços API
│   ├── hooks/          # React hooks customizados
│   └── lib/            # Utilitários
├── server/             # Backend Express
│   ├── routes/         # Rotas API
│   │   ├── maintenance.ts
│   │   ├── materials.ts
│   │   ├── iot.ts
│   │   ├── cameras.ts
│   │   └── ...
│   ├── middleware/     # Middleware (auth, etc.)
│   ├── db.ts          # Configuração PostgreSQL
│   └── index.ts       # Servidor principal
├── shared/            # Código partilhado
└── public/           # Ficheiros estáticos
```

---

## 🚦 Como Começar

### 1. Instalação Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Aceder a: http://localhost:3000

### 2. Build para Produção

```bash
# Build do cliente e servidor
npm run build

# Iniciar em produção
npm start
```

### 3. Deployment Netlify

O deployment é automático através do Netlify MCP:
- Cada push para o repositório faz deploy automático
- URL: https://maintenancecontrol.netlify.app

---

## 🔐 Autenticação

O sistema usa JWT (JSON Web Tokens) para autenticação:

- **Login**: POST `/api/auth/login`
- **Logout**: POST `/api/auth/logout`
- **Refresh Token**: POST `/api/auth/refresh`

Funções de utilizador:
- `admin` - Acesso total
- `technician` - Criar e gerir manutenções
- `operator` - Ver informação e reportar problemas

---

## 📊 API Endpoints Principais

### Equipamentos
- `GET /api/equipment` - Listar equipamentos
- `POST /api/equipment` - Criar equipamento
- `PUT /api/equipment/:id` - Atualizar equipamento
- `DELETE /api/equipment/:id` - Eliminar equipamento

### Materiais
- `GET /api/materials` - Listar materiais
- `POST /api/materials` - Criar material
- `PUT /api/materials/:id` - Atualizar material
- `DELETE /api/materials/:id` - Eliminar material
- `PATCH /api/materials/:id/stock` - Atualizar stock

### Manutenção
- `GET /api/maintenance/records` - Histórico de manutenções
- `GET /api/maintenance/planned` - Manutenções planeadas
- `GET /api/maintenance/requests` - Pedidos de manutenção
- `POST /api/maintenance/requests` - Criar pedido

### IoT (Sensores e Alertas)
- `GET /api/iot/sensors` - Listar sensores
- `POST /api/iot/sensors` - Criar sensor
- `GET /api/iot/alerts` - Listar alertas
- `POST /api/iot/alerts` - Criar alerta

### Câmaras
- `GET /api/cameras` - Listar câmaras
- `POST /api/cameras` - Criar câmara
- `GET /api/camera-reports` - Relatórios de câmaras

---

## 📝 Notas Importantes

### Diferenças do Sistema Original

**Removido:**
- ✗ Sistema de produção de espuma (ordens, blocos, corte)
- ✗ Portal do operador de produção
- ✗ Gestão de stock de espuma
- ✗ Fichas técnicas de espuma
- ✗ Qualidade de produção

**Adicionado:**
- ✓ Stock de materiais genérico
- ✓ Equipamentos genéricos (qualquer indústria)
- ✓ Dashboard focado em manutenção
- ✓ Planeamento de manutenções futuras

**Mantido e Melhorado:**
- ✓ Sistema de manutenção completo
- ✓ Sensores e IoT
- ✓ Câmaras e vigilância
- ✓ Alertas
- ✓ Gestão de equipa

### Base de Dados

**IMPORTANTE:** Este projeto usa uma **nova base de dados Neon** completamente separada do projeto original.

- ✅ Nova DB criada: `dawn-glitter-94042096`
- ✅ Schema otimizado para manutenção
- ✅ Sem dados do projeto anterior
- ✅ Pronto para qualquer tipo de indústria

---

## 🎯 Próximos Passos Sugeridos

1. **Configurar variáveis de ambiente no Netlify**
   - Ir para: https://app.netlify.com/projects/maintenancecontrol
   - Settings > Environment variables
   - Adicionar `DATABASE_URL` e outras variáveis

2. **Criar utilizador administrador**
   - Aceder à base de dados
   - Inserir utilizador na tabela `users`

3. **Adicionar equipamentos de teste**
   - Usar a interface em `/equipment`
   - Criar equipamentos exemplo

4. **Configurar sensores e câmaras**
   - Associar aos equipamentos criados
   - Definir limites de alertas

5. **Testar fluxo completo**
   - Criar manutenção planeada
   - Executar manutenção
   - Registar materiais utilizados
   - Verificar alertas e relatórios

---

## 🆘 Suporte e Documentação

- **Netlify Docs**: https://docs.netlify.com
- **Neon Docs**: https://neon.tech/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **Radix UI**: https://www.radix-ui.com

---

## 👨‍💻 Desenvolvido por Gil Rei

Sistema de Gestão de Manutenção Industrial  
**MaintenanceControl v1.0.0**

---

✅ **Sistema pronto para produção!**
