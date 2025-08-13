# 🚀 Gerar APK FactoryControl - GUIA RÁPIDO

## ⚡ Passos Simples:

### 1️⃣ **Instalar Capacitor**
```bash
npm run install:capacitor
```

### 2️⃣ **Gerar APK automaticamente**
```bash
npm run build:apk
```

### 3️⃣ **Encontrar APK**
O ficheiro estará em:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## 📱 **Instalar no Android:**

1. **Transferir APK** para o telemóvel (USB, email, etc.)
2. **Ativar "Origens Desconhecidas"**:
   - Configurações → Segurança → Origens Desconhecidas → Ativar
3. **Tocar no ficheiro APK** e instalar
4. **Procurar "FactoryControl"** no menu de apps

## ❌ **Se der erro:**

### **Erro: Android SDK**
Precisa instalar **Android Studio**:
- Download: https://developer.android.com/studio
- Instalar com SDK Android

### **Erro: Java JDK**
```bash
# Windows (Chocolatey)
choco install openjdk17

# ou download manual:
# https://adoptium.net/
```

### **Método alternativo (Android Studio):**
```bash
npm run install:capacitor
npm run build:client
npm run cap:android
npm run cap:open
```

No Android Studio: **Build → Build APK(s)**

## ✅ **Resultado:**
- 📱 App Android nativa
- 🏭 FactoryControl completo
- 📷 Câmara integrada
- 📄 Relatórios PDF
- ⚡ Performance otimizada

---
**🔧 Problemas?** Veja `INSTALAR-APK.md` para guia completo
