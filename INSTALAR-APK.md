# 📱 FactoryControl - Gerar APK Android

Este guia explica como converter a aplicação FactoryControl web para um **ficheiro APK** instalável em dispositivos Android.

## 🎯 **O que é APK?**
- **APK** = Ficheiro de instalação Android nativo
- **Instala diretamente** no telemóvel sem navegador
- **Funciona offline** com todas as funcionalidades
- **Pode ser distribuído** via Play Store ou instalação manual

## 🛠️ **Pré-requisitos**

### **1. Node.js e npm**
```bash
node --version  # v18 ou superior
npm --version   # v8 ou superior
```

### **2. Android Studio** (para gerar APK)
- Descarregue: https://developer.android.com/studio
- Instale com SDK Android
- Configure variáveis de ambiente

### **3. Java JDK 17+**
```bash
java --version  # OpenJDK 17+
```

## 🚀 **Passos para Gerar APK**

### **Método 1: Script Automático (Recomendado)**

```bash
# 1. Instalar dependências
npm run install:capacitor

# 2. Gerar APK automaticamente
npm run build:apk
```

O script irá:
1. ✅ Verificar dependências
2. ✅ Fazer build da aplicação
3. ✅ Configurar Capacitor Android
4. ✅ Gerar APK em `android/app/build/outputs/apk/debug/`

### **Método 2: Android Studio**

```bash
# 1. Preparar projeto
npm run build
npm run cap:android
npm run cap:sync

# 2. Abrir Android Studio
npm run cap:open
```

No Android Studio:
1. Aguarde projeto carregar
2. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. APK gerado em: `android/app/build/outputs/apk/debug/app-debug.apk`

### **Método 3: Manual (Linha de comandos)**

```bash
# 1. Build da aplicação web
npm run build

# 2. Adicionar plataforma Android
npx cap add android

# 3. Sincronizar ficheiros
npx cap sync

# 4. Gerar APK
cd android
./gradlew assembleDebug
```

## 📱 **Instalar APK no Telemóvel**

### **1. Ativar "Origens Desconhecidas"**
- **Configurações** → **Segurança** → **Origens Desconhecidas** → **Ativar**
- Ou: **Configurações** → **Apps** → **Menu** �� **Acesso especial** → **Instalar apps desconhecidas**

### **2. Transferir APK**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**Métodos de transferência:**
- **USB**: Copiar ficheiro diretamente
- **Email**: Enviar APK por email e abrir no telemóvel
- **Drive**: Upload para Google Drive/Dropbox
- **ADB**: `adb install app-debug.apk`

### **3. Instalar**
1. Toque no ficheiro **app-debug.apk**
2. Toque em **Instalar**
3. Aguarde instalação
4. Toque em **Abrir** ou procure "FactoryControl" no menu

## ✅ **Verificar Instalação**

Após instalar o APK:
- ✅ Ícone "FactoryControl" no menu de apps
- ✅ Abre em ecrã completo (sem navegador)
- ✅ Funciona offline
- ✅ Acesso à câmara para checklists
- ✅ Notificações de manutenção

## 🐛 **Resolução de Problemas**

### **Erro: "Android SDK não encontrado"**
```bash
export ANDROID_HOME=/path/to/android-sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### **Erro: "Gradle build failed"**
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### **Erro: "App não instala"**
- Verificar se "Origens Desconhecidas" está ativo
- Tentar desinstalar versão anterior
- Verificar espaço de armazenamento

### **App não abre ou crash**
- Verificar logs: `adb logcat | grep FactoryControl`
- Reinstalar APK
- Verificar permissões da câmara

## 🔧 **Configurações Avançadas**

### **Assinatura de APK (Produção)**
```bash
# Gerar keystore
keytool -genkey -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias release

# Build release
cd android
./gradlew assembleRelease
```

### **Ícones e Splash Screen**
- Coloque ícones em: `android/app/src/main/res/`
- Tamanhos: 48, 72, 96, 144, 192, 512px
- Formato: PNG transparente

## 📋 **Funcionalidades APK**

✅ **Gestão de Manutenção** - Completa
✅ **Checklist DL50** - Com câmara integrada  
✅ **Relatórios PDF** - Geração offline
✅ **Anexos Fotográficos** - Câmara nativa
✅ **Notificações** - Alertas de manutenção
✅ **Offline** - Funciona sem internet
✅ **Performance** - App nativa Android

## 🎉 **Resultado Final**

Após seguir este guia terá:
- **📱 Ficheiro APK** pronto para distribuição
- **🏭 App Android nativa** FactoryControl
- **⚡ Performance optimizada** para móvel
- **📶 Funcionamento offline** completo

---

**💡 Dica:** Para distribuição via Google Play Store, precisará de assinatura digital e cumprimento das políticas da Google.
