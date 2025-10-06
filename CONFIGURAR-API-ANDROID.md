# 🔧 Configurar Ligação ao Servidor - App Android

## ❌ Problema: "Não tenho ligação ao servidor"

A app Android não consegue conectar porque está a tentar aceder a `localhost`, que no dispositivo Android refere-se ao próprio dispositivo, não ao servidor.

## ✅ Solução: Configurar URL da API

### Passo 1: Descobrir o IP do Servidor

**Windows:**
```cmd
ipconfig
```
Procure por "IPv4 Address", por exemplo: `192.168.1.100`

**Linux/Mac:**
```bash
ifconfig
# ou
ip addr
```
Procure pela interface de rede (ex: eth0, wlan0)

### Passo 2: Criar Ficheiro de Configuração

Crie o ficheiro `.env.local` na raiz do projeto:

```bash
VITE_API_URL=http://192.168.1.100:5000
```

Substitua `192.168.1.100` pelo IP real do seu servidor.

### Passo 3: Rebuild da App

```bash
# Build do frontend com nova configuração
npm run build

# Sincronizar com Android
npx cap sync android
```

### Passo 4: Reinstalar APK

Gere um novo APK no Android Studio e instale no dispositivo.

---

## 📋 Checklist de Verificação

Antes de gerar o APK, confirme:

- [ ] Ficheiro `.env.local` criado com `VITE_API_URL`
- [ ] Servidor backend está a correr (`npm start` ou `npm run dev`)
- [ ] Dispositivo Android está na mesma rede WiFi que o servidor
- [ ] Firewall permite conexões na porta do servidor (ex: 5000)
- [ ] IP está correto (teste acedendo `http://IP:5000/api/machines` no browser do telemóvel)

---

## 🧪 Testar Ligação

### No Browser do Telemóvel:

Antes de gerar o APK, teste se consegue aceder ao servidor:

1. Abra o browser do telemóvel (Chrome, Firefox, etc.)
2. Aceda: `http://192.168.1.100:5000/api/machines` (use o seu IP)
3. Se aparecer dados JSON → ✅ Servidor acessível
4. Se der erro de conexão → ❌ Problema de rede/firewall

### Na App (depois de instalar):

Abra a app e verifique:
- Se aparecer dados do dashboard → ✅ Tudo OK
- Se aparecer "Não tenho ligação" → ⚠️ Verificar configuração

---

## 🔥 Troubleshooting

### "Ainda não consigo conectar"

1. **Verificar se o servidor está ativo:**
   ```bash
   curl http://localhost:5000/api/machines
   ```

2. **Verificar firewall Windows:**
   - Painel de Controlo → Firewall
   - Regras de entrada → Nova regra
   - Permitir porta 5000 TCP

3. **Verificar se está na mesma rede:**
   - Telemóvel e servidor devem estar no mesmo WiFi
   - Não funciona se o telemóvel estiver em dados móveis (4G/5G)

4. **Usar IP em vez de localhost:**
   - ❌ ERRADO: `VITE_API_URL=http://localhost:5000`
   - ✅ CORRETO: `VITE_API_URL=http://192.168.1.100:5000`

### "CORS Error"

Se aparecer erro de CORS no console:

No servidor (ficheiro `server/index.ts`), adicionar:
```typescript
app.use(cors({
  origin: '*', // Em produção, especificar o domínio
  credentials: true
}));
```

---

## 📱 Produção (Servidor Online)

Se tiver um servidor online (ex: Heroku, DigitalOcean, AWS):

```bash
# .env.local
VITE_API_URL=https://seu-servidor.com
```

Neste caso, não precisa estar na mesma rede WiFi.

---

## 📚 Mais Informações

Ver documentação completa: [APP-MANUTENCAO-ANDROID.md](./APP-MANUTENCAO-ANDROID.md)
