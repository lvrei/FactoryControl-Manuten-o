# 🔄 Como a App Android Acede aos Dados do Neon

## 📊 Arquitetura (Fluxo Correto)

```
┌─────────────────┐
│  📱 App Android │
│     (APK)       │  ← Instalada no telemóvel
└────────┬────────┘
         │ HTTP Request
         │ GET /api/machines
         ↓
┌─────────────────┐
│  🌐 Servidor    │
│   Backend       │  ← Rodando no PC/servidor (porta 3001)
│ (Node.js)       │  ← Tem acesso ao .env com DATABASE_URL
└────────┬────────┘
         │ SQL Query
         │ SELECT * FROM machines
         ↓
┌─────────────────┐
│  🗄️ Neon DB     │
│  (PostgreSQL)   │  ← Base de dados na cloud
└─────────────────┘
```

## ✅ Como Configurar (Passo a Passo)

### **1️⃣ Servidor Backend (já têm configurado)**

Ficheiro: `.env` (na raiz do projeto)

```env
PORT=3001
DATABASE_URL=postgresql://neondb_owner:npg_Qmyv86drNVFa@ep-crimson-water-ae2o1se4-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require
```

✅ **Este ficheiro fica NO SERVIDOR** (nunca vai para a app!)

### **2️⃣ Iniciar Servidor**

```bash
# No PC/servidor onde vai correr o backend
npm start
# ou
npm run dev
```

Servidor estará em: `http://localhost:3001`

### **3️⃣ Descobrir IP do Servidor**

```bash
# Windows
ipconfig
# Procurar: IPv4 Address ... 192.168.1.100

# Linux/Mac
ifconfig
# Procurar: inet 192.168.1.100
```

### **4️⃣ Configurar App para Conectar ao Servidor**

Ficheiro: `.env.local` (na raiz do projeto)

```env
VITE_API_URL=http://192.168.1.100:3001
```

⚠️ Substituir `192.168.1.100` pelo IP real do servidor!

### **5️⃣ Build da App**

```bash
# Build com configuração da API
npm run build

# Sincronizar com Android
npx cap sync android

# Gerar APK no Android Studio
npx cap open android
```

---

## 🔐 Segurança - Por que NÃO Direto?

### ��� **ERRADO** (Inseguro):

```
App Android → Neon Database
              (usando DATABASE_URL direto)
```

**Problemas:**

- 🚨 Credenciais da DB expostas no APK
- 🚨 Qualquer pessoa pode extrair e usar
- 🚨 Sem validação, sem autenticação
- 🚨 Neon não aceita conexões diretas de mobile

### ✅ **CORRETO** (Seguro):

```
App Android → Servidor Backend → Neon Database
              (com autenticação)
```

**Vantagens:**

- ✅ Credenciais protegidas no servidor
- ✅ Autenticação JWT na app
- ✅ Validação de dados
- ✅ Logs e auditoria
- ✅ Controlo de acesso

---

## 📱 Ficheiros Necessários

### No Servidor (PC onde corre o backend):

1. **`.env`** - Configuração do servidor

   ```env
   PORT=3001
   DATABASE_URL=postgresql://...neon.tech/neondb
   JWT_SECRET=...
   ```

2. **Servidor rodando:**
   ```bash
   npm start
   ```

### Para Build da App:

1. **`.env.local`** - URL do servidor

   ```env
   VITE_API_URL=http://192.168.1.100:3001
   ```

2. **Build:**
   ```bash
   npm run build
   npx cap sync android
   ```

---

## 🧪 Testar Ligação

### 1. Servidor está ativo?

```bash
curl http://localhost:3001/api/machines
# Deve retornar JSON com máquinas
```

### 2. Acessível do telemóvel?

No browser do telemóvel:

```
http://192.168.1.100:3001/api/machines
```

✅ Se aparecer JSON → Tudo OK
❌ Se der erro → Problema de rede/firewall

### 3. App consegue conectar?

Instalar APK e verificar:

- Dashboard mostra dados → ✅ Funcionou
- "Sem ligação" → ❌ Ver CONFIGURAR-API-ANDROID.md

---

## 📋 Checklist Rápido

Antes de gerar APK:

- [ ] Servidor backend está rodando (`npm start`)
- [ ] `.env` tem `DATABASE_URL` do Neon
- [ ] Descobriu o IP do servidor (`ipconfig`)
- [ ] Criou `.env.local` com `VITE_API_URL=http://IP:3001`
- [ ] Testou acesso no browser do telemóvel
- [ ] Dispositivo na mesma rede WiFi que servidor
- [ ] Fez `npm run build` e `npx cap sync android`

---

## 🚀 Produção (Servidor Online)

Se colocar o backend num servidor online (Heroku, DigitalOcean, AWS, etc.):

**`.env.local`:**

```env
VITE_API_URL=https://seu-servidor.com
```

Neste caso:

- ✅ Não precisa estar na mesma WiFi
- ✅ App funciona com internet (4G/5G)
- ✅ Mais seguro e profissional

---

## 📚 Resumo

| Ficheiro     | Onde Fica | Contém                       | Para Quê                     |
| ------------ | --------- | ---------------------------- | ---------------------------- |
| `.env`       | Servidor  | `DATABASE_URL`, `JWT_SECRET` | Servidor aceder ao Neon      |
| `.env.local` | Build App | `VITE_API_URL`               | App saber onde está servidor |
| APK          | Telemóvel | Código da app                | Interface do utilizador      |

**Fluxo:**

1. Utilizador abre app no telemóvel
2. App faz pedido HTTP ao servidor (usando `VITE_API_URL`)
3. Servidor valida, acede ao Neon (usando `DATABASE_URL`)
4. Servidor devolve dados à app
5. App mostra dados ao utilizador

✅ **Simples, seguro e correto!**
