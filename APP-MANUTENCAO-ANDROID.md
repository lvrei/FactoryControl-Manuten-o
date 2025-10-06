# 📱 App Android - FactoryControl Manutenção

**App Mobile Focada 100% em Manutenção**  
Versão nativa Android (APK) para equipas de manutenção.

---

## 🎯 Funcionalidades Principais

### ✅ **Implementadas:**

1. **📊 Dashboard de Manutenção**

   - Máquinas paradas
   - Alertas urgentes
   - Manutenções agendadas
   - Estatísticas em tempo real

2. **📷 Scanner QR Code**

   - Acesso rápido a informações da máquina
   - Câmara integrada
   - Detecção automática
   - Feedback visual e sonoro

3. **🏭 Página Dedicada por Máquina**

   - Informações técnicas completas
   - Histórico de manutenção
   - Sensores em tempo real
   - Câmaras associadas
   - Chat de equipa
   - QR Code para imprimir

4. **💬 Chat em Tempo Real**

   - Comunicação operador ↔ manutenção
   - Histórico por máquina
   - Notificações de novas mensagens
   - Anexos e fotos

5. **🚨 Sistema de Alertas**

   - Alertas de sensores
   - Avarias reportadas
   - Pedidos de assistência
   - Manutenções agendadas

6. **📋 Gestão de Manutenções**

   - Criar nova manutenção
   - Ver manutenções pendentes
   - Histórico completo
   - Relatórios

7. **📱 Notificações Push**

   - Alertas críticos
   - Novas solicitações
   - Manutenções vencidas
   - Mensagens de chat
   - Funciona mesmo com app fechada

8. **🔍 Sensores IoT**
   - Leituras em tempo real
   - Histórico de dados
   - Alertas de limiar
   - Gráficos de tendência

---

## ⚙️ Configuração da API

**IMPORTANTE**: Para que a app Android consiga conectar ao servidor, você precisa configurar o URL da API.

### Configurar URL do Servidor:

1. **Criar ficheiro `.env.local`** (ou editar `.env`):

```bash
# URL completo do servidor backend
# Exemplo com IP local:
VITE_API_URL=http://192.168.1.100:5000

# Ou com domínio:
VITE_API_URL=https://seu-servidor.com
```

2. **Descobrir o IP do seu servidor**:

```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

3. **Garantir que o servidor está acessível**:
   - O servidor deve estar rodando (`npm run dev` ou `npm start`)
   - O firewall deve permitir conexões na porta (ex: 5000)
   - O dispositivo Android deve estar na mesma rede (WiFi)

### ⚠️ Problemas Comuns:

| Problema | Solução |
|----------|---------|
| "Não tenho ligação ao servidor" | Verificar `VITE_API_URL` em `.env.local` |
| Timeout nas chamadas | Verificar firewall e se servidor está ativo |
| CORS errors | Configurar CORS no servidor para aceitar o IP do dispositivo |

### 🔍 Verificar Configuração:

Abra a app e verifique o console do browser (DevTools):
- Deve aparecer o URL da API sendo usado
- Se aparecer `http://localhost`, o `.env` não está configurado

---

## 📦 Componentes Criados

### 1. **QRCodeGenerator**

```tsx
<QRCodeGenerator
  equipmentId="CNC-01"
  equipmentName="CNC - Acabamento"
  size={250}
  showControls={true}
/>
```

**Funcionalidades:**

- ✅ Gera QR code automaticamente
- ✅ Botão de download (PNG)
- ✅ Botão de impressão (formatado)
- ✅ Folha A4 profissional
- ✅ URL embuti do: `/machine/{id}`

### 2. **QRCodeScanner**

```tsx
<QRCodeScanner
  onScan={(machineId) => navigate(`/machine/${machineId}`)}
  onClose={() => setShowScanner(false)}
/>
```

**Funcionalidades:**

- ✅ Usa câmara traseira do telemóvel
- ✅ Detecção automática
- ✅ Feedback visual (moldura, cores)
- ✅ Redirecionamento automático
- ✅ Tratamento de erros

### 3. **MachinePage**

Página dedicada: `/machine/{machineId}`

**Tabs:**

- 📋 Informações (detalhes técnicos, dimensões)
- 🔧 Manutenção (histórico, pedidos)
- 📊 Sensores (leituras em tempo real)
- 📹 Câmaras (visualização ao vivo)
- 💬 Chat (comunicação da equipa)
- 🏷️ QR Code (imprimir etiqueta)

---

## 🛠️ Stack Tecnológico

### **Frontend:**

- React + TypeScript
- Vite
- TailwindCSS
- Lucide Icons
- React Router

### **Mobile (Capacitor):**

- @capacitor/core
- @capacitor/camera
- @capacitor/haptics
- @capacitor/local-notifications
- @capacitor/push-notifications

### **QR Code:**

- qrcode.react (geração)
- html5-qrcode (scanner)

### **Backend:**

- Node.js + Express
- PostgreSQL (Neon)
- WebSocket (chat tempo real)

---

## 📲 Instalação - Gerar APK

### **Pré-requisitos:**

1. ✅ Node.js 18+ instalado
2. ✅ Android Studio instalado
3. ✅ Java JDK 11 ou 17
4. ✅ Variável ANDROID_HOME configurada

### **Passo 1: Configurar URL da API**

**CRÍTICO**: Antes de gerar o APK, configure o URL do servidor:

```bash
# Criar ficheiro .env.local
echo "VITE_API_URL=http://SEU_IP:5000" > .env.local

# Exemplo: Se o IP do servidor é 192.168.1.100
echo "VITE_API_URL=http://192.168.1.100:5000" > .env.local
```

⚠️ **Sem esta configuração, a app não conseguirá conectar ao servidor!**

### **Passo 2: Preparar Projeto**

```bash
# Instalar dependências
npm install

# Build do frontend (com configuração da API)
npm run build
```

### **Passo 3: Configurar Capacitor**

```bash
# Sincronizar com Android
npx cap sync android

# Abrir no Android Studio
npx cap open android
```

### **Passo 4: Gerar APK no Android Studio**

1. **Build → Generate Signed Bundle / APK**
2. Escolher **APK**
3. Criar ou selecionar keystore
4. Build **Release**
5. APK gerado em: `android/app/build/outputs/apk/release/`

### **Passo 5: Instalar no Telemóvel**

```bash
# Via ADB
adb install app-release.apk

# Ou enviar APK para telemóvel e instalar manualmente
```

---

## 🎨 Design - Industrial & Profissional

### **Paleta de Cores:**

```css
Primary: #2563eb (Azul Industrial)
Success: #10b981 (Verde)
Warning: #f59e0b (Laranja)
Danger: #ef4444 (Vermelho)
Dark: #1e293b (Cinza Escuro)
```

### **Tipografia:**

- Headings: **Inter Bold**
- Body: **Inter Regular**
- Monospace: **Courier New** (IDs, códigos)

### **Componentes:**

- ✅ Gradientes sutis
- ✅ Glassmorphism
- ✅ Sombras modernas
- ✅ Animações suaves
- ✅ Hover states profissionais
- ✅ Icons consistentes (Lucide)

---

## 📋 Estrutura de Páginas (Menu Simplificado)

### **Menu Principal:**

```
📊 Dashboard Manutenção
🏭 Máquinas
🚨 Alertas
📊 Sensores
💬 Chat
🔧 Manutenções
📸 Câmaras
📷 Scanner QR
```

### **Páginas Removidas (não relevantes para manutenção):**

- ❌ Produção / OPs
- ❌ Portal do Operador
- ❌ Stock
- ❌ Planeamento
- ❌ Qualidade

---

## 🔔 Sistema de Notificações Push

### **Tipos de Notificações:**

1. **🚨 Alertas Críticos**

   ```
   Título: ⚠️ Alerta Crítico - CNC-01
   Mensagem: Temperatura acima do limite (85°C)
   Ação: Abrir máquina CNC-01
   ```

2. **🔧 Pedidos de Manutenção**

   ```
   Título: 🔧 Nova Solicitação
   Mensagem: Operador reportou ruído anormal em BZM-01
   Ação: Ver detalhes
   ```

3. **📅 Manutenções Agendadas**

   ```
   Título: 📅 Manutenção Programada
   Mensagem: Carrossel-01 - Manutenç��o preventiva hoje às 14h
   Ação: Abrir manutenção
   ```

4. **💬 Novas Mensagens**
   ```
   Título: 💬 Nova Mensagem
   Mensagem: Pedro Costa: Máquina pronta para revisão
   Ação: Abrir chat
   ```

### **Configuração (AndroidManifest.xml):**

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

---

## 📷 Fluxo de Uso - Scanner QR

### **Cenário 1: Técnico chega à máquina**

1. Abre app FactoryControl Manutenção
2. Clica no botão **"Scanner QR"** (floating button)
3. Aponta câmara para QR code na máquina
4. ✅ **Detecção automática**
5. Redireciona para página da máquina
6. Acessa:
   - Histórico de manutenção
   - Sensores atuais
   - Câmaras ao vivo
   - Chat com operador
   - Criar nova manutenção

### **Cenário 2: Imprimir QR Codes**

1. Menu → Máquinas → Escolher máquina
2. Tab "QR Code"
3. Clica **"Imprimir"**
4. Folha A4 formatada é gerada
5. Imprimir e colar na máquina

---

## 🔐 Permissões Necessárias (Android)

```xml
<!-- Câmara (scanner QR) -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Notificaç��es -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Internet -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Armazenamento (download QR) -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<!-- Rede -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

---

## 🚀 Próximos Passos

### **Fase 1: ✅ Completado**

- [x] QR Code Generator
- [x] QR Code Scanner
- [x] Página dedicada de máquina
- [x] Sistema de impressão
- [x] Integração chat existente

### **Fase 2: Em Desenvolvimento**

- [ ] Notificações Push configuradas
- [ ] Haptic feedback no scanner
- [ ] Offline mode (dados em cache)
- [ ] Dark mode automático
- [ ] Assinatura digital (keystore)

### **Fase 3: Futuro**

- [ ] Widget Android (próximas manutenções)
- [ ] Shortcuts (scanner direto)
- [ ] Wear OS support
- [ ] Integração NFC (alternativa a QR)

---

## 📞 Suporte

**Problemas Comuns:**

### **Scanner não funciona:**

- Verificar permissões de câmara
- Reiniciar app
- Boa iluminaç��o é essencial

### **APK não instala:**

- Permitir "Fontes Desconhecidas"
- Verificar versão Android (min: 7.0)

### **Notificações não chegam:**

- Verificar permissões
- Desativar otimização de bateria para app
- Verificar internet

---

## 📄 Licença

© 2024 FactoryControl - Gil Rei  
App focada em Manutenção Industrial

---

**Última atualização:** 2024  
**Versão App:** 1.0.0  
**Versão Android Mínima:** 7.0 (API 24)  
**Versão Android Alvo:** 14 (API 34)
