# 📱 Como Gerar APK Android - FactoryControl Manutenção

Guia passo a passo para gerar o APK da app Android focada em Manutenção.

---

## 📋 Pré-requisitos

### **1. Instalar Node.js**

- Download: https://nodejs.org
- Versão mínima: 18.0.0
- Verificar: `node --version`

### **2. Instalar Android Studio**

- Download: https://developer.android.com/studio
- Durante instalação, incluir:
  - ✅ Android SDK
  - ✅ Android SDK Platform
  - ✅ Android Virtual Device

### **3. Instalar Java JDK**

- Download: https://adoptium.net (OpenJDK 17)
- Ou usar bundled com Android Studio

### **4. Configurar Variáveis de Ambiente**

**Windows:**

```
ANDROID_HOME=C:\Users\SeuNome\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Java\jdk-17
```

Adicionar ao PATH:

```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%JAVA_HOME%\bin
```

**Linux/Mac:**

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools
```

Adicionar ao `~/.bashrc` ou `~/.zshrc`

---

## 🚀 Passo a Passo - Gerar APK

### **Passo 1: Preparar Projeto**

```bash
# Clone ou navegue até o projeto
cd factorycontrol

# Instale dependências
npm install

# Verifique se está tudo OK
npm run build
```

### **Passo 2: Adicionar Capacitor Android (primeira vez apenas)**

```bash
# Adicionar plataforma Android
npx cap add android

# Ou se já existe, sincronizar
npx cap sync android
```

### **Passo 3: Configurar App ID e Nome**

Editar `capacitor.config.json`:

```json
{
  "appId": "com.factorycontrol.maintenance",
  "appName": "FactoryControl Manutenção"
}
```

### **Passo 4: Build do Frontend**

```bash
npm run build
```

### **Passo 5: Sincronizar com Android**

```bash
npx cap sync android
```

### **Passo 6: Abrir no Android Studio**

```bash
npx cap open android
```

Ou manualmente:

1. Abrir Android Studio
2. **Open** → Escolher pasta `android/`
3. Aguardar indexação e sync do Gradle

### **Passo 7: Criar Keystore (primeira vez)**

**Via Linha de Comando:**

```bash
keytool -genkey -v -keystore my-release-key.keystore \
  -alias factorycontrol-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Preencher:**

- Nome: Factory Control
- Empresa: Sua Empresa
- Senha: _(guardar num lugar seguro!)_

**Via Android Studio:**

1. **Build → Generate Signed Bundle / APK**
2. Escolher **APK**
3. Click **Create new...**
4. Preencher formulário
5. Guardar keystore num lugar seguro

### **Passo 8: Gerar APK Assinado**

**No Android Studio:**

1. **Build → Generate Signed Bundle / APK**
2. Escolher **APK** (n��o Bundle)
3. Click **Next**
4. Selecionar keystore criado
5. Preencher senhas
6. Click **Next**
7. Escolher **release**
8. ✅ **V1 Signature (Jar Signature)** - marcar
9. ✅ **V2 Signature (Full APK)** - marcar
10. Click **Finish**

**Aguardar Build...**

```
BUILD SUCCESSFUL in 2m 34s
```

### **Passo 9: Localizar APK**

APK gerado em:

```
android/app/build/outputs/apk/release/app-release.apk
```

Tamanho aproximado: **15-25 MB**

---

## 📲 Instalar no Telemóvel

### **Método 1: Via ADB (USB)**

```bash
# Ligar USB Debugging no telemóvel
# Conectar telemóvel ao PC via USB

# Verificar dispositivo conectado
adb devices

# Instalar APK
adb install android/app/build/outputs/apk/release/app-release.apk

# Ou se já existe (atualizar)
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### **Método 2: Manual**

1. Copiar `app-release.apk` para telemóvel
2. Abrir ficheiro no telemóvel
3. Permitir **"Instalar de fontes desconhecidas"** se necessário
4. Click **Instalar**

### **Método 3: Via QR Code**

1. Upload APK para servidor/cloud
2. Gerar QR code com link
3. Escanear com telemóvel
4. Download e instalar

---

## ⚙️ Configurações Android

### **Permissões (AndroidManifest.xml)**

Já configuradas automaticamente:

```xml
<!-- Câmara (Scanner QR) -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Internet -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Notificações -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Armazenamento -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### **Versão Android**

```gradle
android {
    compileSdkVersion 34

    defaultConfig {
        applicationId "com.factorycontrol.maintenance"
        minSdkVersion 24  // Android 7.0
        targetSdkVersion 34 // Android 14
        versionCode 1
        versionName "1.0.0"
    }
}
```

### **Ícone da App**

Substituir ícones em:

```
android/app/src/main/res/
  ├── mipmap-hdpi/ic_launcher.png
  ├── mipmap-mdpi/ic_launcher.png
  ├── mipmap-xhdpi/ic_launcher.png
  ├── mipmap-xxhdpi/ic_launcher.png
  └── mipmap-xxxhdpi/ic_launcher.png
```

**Gerar ícones:**

- Use https://icon.kitchen
- Upload logo 1024x1024
- Download pack Android

---

## 🐛 Resolução de Problemas

### **Erro: "ANDROID_HOME not set"**

```bash
# Windows
set ANDROID_HOME=C:\Users\SeuNome\AppData\Local\Android\Sdk

# Linux/Mac
export ANDROID_HOME=$HOME/Android/Sdk
```

### **Erro: "Gradle sync failed"**

1. Android Studio → **File → Invalidate Caches**
2. Restart
3. **File → Sync Project with Gradle Files**

### **Erro: "SDK not found"**

1. Android Studio → **Tools → SDK Manager**
2. Instalar **Android SDK Platform 34**
3. Instalar **Build Tools 34.0.0**

### **Erro: "Keystore not found"**

- Verificar caminho da keystore
- Garantir senhas corretas
- Recriar se perdida (⚠️ perderá assinatura anterior)

### **APK não instala no telemóvel**

- Ativar **"Fontes Desconhecidas"**
- Verificar se é Android 7.0+
- Desinstalar versão antiga primeiro
- Verificar espaço disponível

### **App crasha ao abrir**

1. Verificar logs:
   ```bash
   adb logcat | grep FactoryControl
   ```
2. Verificar permissões
3. Verificar internet/API

---

## 📦 Build Automatizado

### **Script Bash (Linux/Mac):**

```bash
#!/bin/bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
cd ..
echo "APK: android/app/build/outputs/apk/release/app-release.apk"
```

### **Script PowerShell (Windows):**

```powershell
npm install
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleRelease
cd ..
Write-Host "APK: android\app\build\outputs\apk\release\app-release.apk"
```

---

## 🚀 Distribuição

### **Opção 1: Manual**

- Enviar APK por email/WhatsApp
- Instalar manualmente

### **Opção 2: Google Play Store**

1. Criar conta Google Play Developer ($25 único)
2. Build → **Generate Signed Bundle**
3. Upload `.aab` file
4. Preencher formulários
5. Publicar

### **Opção 3: Internal Distribution**

- Firebase App Distribution
- AppCenter
- TestFlight (iOS)

---

## ✅ Checklist Final

Antes de distribuir APK:

- [ ] Testado em pelo menos 2 dispositivos
- [ ] Todas as funcionalidades funcionam
- [ ] Notificações push configuradas
- [ ] Scanner QR funciona
- [ ] Chat carrega mensagens
- [ ] Sem crashes ou bugs críticos
- [ ] Ícone correto
- [ ] Nome da app correto
- [ ] Versão incrementada
- [ ] Keystore backup seguro

---

## 📞 Suporte

**Problemas durante build:**

1. Verificar logs do Android Studio
2. Limpar cache: `./gradlew clean`
3. Recriar projeto: `npx cap sync android`

**App não funciona:**

1. Verificar conexão internet
2. Verificar URL da API
3. Ver logs: `adb logcat`

---

**Última atualização:** 2024  
**Versão:** 1.0.0
