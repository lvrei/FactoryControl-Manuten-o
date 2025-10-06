#!/bin/bash

# FactoryControl - Build Android App (Manutenção)
# Este script prepara e gera o APK da app Android

echo "🏭 FactoryControl - Build Android App"
echo "======================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale Node.js 18+ primeiro."
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado."
    exit 1
fi

echo "✅ npm encontrado: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Instalando dependências..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências"
    exit 1
fi

echo "✅ Dependências instaladas"

# Build frontend
echo ""
echo "🔨 Build do frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build do frontend"
    exit 1
fi

echo "✅ Frontend compilado"

# Sync with Capacitor
echo ""
echo "🔄 Sincronizando com Capacitor Android..."
npx cap sync android

if [ $? -ne 0 ]; then
    echo "❌ Erro ao sincronizar com Android"
    exit 1
fi

echo "✅ Sincronização completa"

# Check if Android Studio / Gradle is available
echo ""
echo "📱 Preparando Android..."

if [ ! -d "android" ]; then
    echo "❌ Pasta 'android' não encontrada"
    echo "Execute: npx cap add android"
    exit 1
fi

echo "✅ Projeto Android pronto"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Build preparado com sucesso!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1️⃣  Abrir no Android Studio:"
echo "    npx cap open android"
echo ""
echo "2️⃣  No Android Studio:"
echo "    Build → Generate Signed Bundle / APK"
echo "    → Escolher 'APK'"
echo "    → Selecionar keystore (criar se necessário)"
echo "    → Build 'release'"
echo ""
echo "3️⃣  APK será gerado em:"
echo "    android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "4️⃣  Instalar no telemóvel:"
echo "    adb install app-release.apk"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Dica: Para criar keystore pela primeira vez:"
echo "   keytool -genkey -v -keystore my-release-key.keystore \\"
echo "   -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000"
echo ""
