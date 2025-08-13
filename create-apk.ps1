# FactoryControl APK Generator - PowerShell
# Solução nativa Windows sem dependências complexas

Write-Host "📱 FactoryControl - Gerador APK PowerShell" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Verificar Node.js
Write-Host "🔍 Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado" -ForegroundColor Red
    Write-Host "💡 Instale de: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Instalar Cordova globalmente
Write-Host "📦 Verificando/Instalando Cordova..." -ForegroundColor Yellow
try {
    $cordovaVersion = cordova --version
    Write-Host "✅ Cordova: $cordovaVersion" -ForegroundColor Green
} catch {
    Write-Host "📦 Instalando Cordova..." -ForegroundColor Yellow
    npm install -g cordova
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar Cordova" -ForegroundColor Red
        exit 1
    }
}

# Build da aplicação web
Write-Host "🏗️ Fazendo build da aplicação..." -ForegroundColor Yellow
npm run build:client
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build" -ForegroundColor Red
    exit 1
}

# Verificar se dist/spa existe
if (!(Test-Path "dist/spa/index.html")) {
    Write-Host "❌ Build não gerou ficheiros corretos" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build concluído" -ForegroundColor Green

# Criar projeto Cordova
Write-Host "📱 Criando projeto Cordova..." -ForegroundColor Yellow
if (Test-Path "cordova-app") {
    Remove-Item -Recurse -Force "cordova-app"
}

cordova create cordova-app com.factorycontrol.maintenance FactoryControl
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao criar projeto Cordova" -ForegroundColor Red
    exit 1
}

# Copiar ficheiros
Write-Host "📁 Copiando ficheiros da aplicação..." -ForegroundColor Yellow
Set-Location cordova-app

# Remover www padrão e copiar nossa app
Remove-Item -Recurse -Force www
Copy-Item -Recurse -Path "../dist/spa" -Destination "www"

Write-Host "✅ Ficheiros copiados" -ForegroundColor Green

# Configurar config.xml para Android
Write-Host "⚙️ Configurando para Android..." -ForegroundColor Yellow
$configXml = @"
<?xml version='1.0' encoding='utf-8'?>
<widget id="com.factorycontrol.maintenance" version="1.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
    <name>FactoryControl</name>
    <description>Sistema de Gestão de Manutenção Industrial</description>
    <author email="admin@factorycontrol.com" href="https://factorycontrol.com">
        FactoryControl Team
    </author>
    <content src="index.html" />
    <allow-intent href="http://*/*" />
    <allow-intent href="https://*/*" />
    <allow-intent href="tel:*" />
    <allow-intent href="sms:*" />
    <allow-intent href="mailto:*" />
    <allow-intent href="geo:*" />
    <platform name="android">
        <allow-intent href="market:*" />
        <preference name="android-minSdkVersion" value="22" />
        <preference name="android-targetSdkVersion" value="33" />
    </platform>
    <access origin="*" />
    <allow-navigation href="*" />
    <preference name="DisallowOverscroll" value="true" />
    <preference name="android-minSdkVersion" value="22" />
    <preference name="android-targetSdkVersion" value="33" />
    <preference name="android-installLocation" value="auto" />
</widget>
"@

$configXml | Out-File -FilePath "config.xml" -Encoding UTF8
Write-Host "✅ Configuração Android aplicada" -ForegroundColor Green

# Adicionar plataforma Android
Write-Host "📱 Adicionando plataforma Android..." -ForegroundColor Yellow
cordova platform add android
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Aviso: Problema ao adicionar plataforma Android" -ForegroundColor Yellow
}

# Verificar se Java está disponível
Write-Host "☕ Verificando Java..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "✅ Java disponível" -ForegroundColor Green
} catch {
    Write-Host "❌ Java não encontrado" -ForegroundColor Red
    Write-Host "💡 Instale Java JDK de: https://adoptium.net/" -ForegroundColor Yellow
    Set-Location ..
    exit 1
}

# Gerar APK
Write-Host "🚀 Gerando APK (pode demorar alguns minutos)..." -ForegroundColor Yellow
Write-Host "⏳ Aguarde..." -ForegroundColor Yellow

cordova build android
$buildResult = $LASTEXITCODE

Set-Location ..

if ($buildResult -eq 0) {
    # Procurar APK gerado
    $apkPaths = @(
        "cordova-app\platforms\android\app\build\outputs\apk\debug\app-debug.apk",
        "cordova-app\platforms\android\build\outputs\apk\debug\android-debug.apk"
    )

    $apkFound = $false
    foreach ($apkPath in $apkPaths) {
        if (Test-Path $apkPath) {
            $apkSize = (Get-Item $apkPath).Length / 1MB
            Write-Host ""
            Write-Host "🎉 APK GERADO COM SUCESSO!" -ForegroundColor Green
            Write-Host "📁 Localização: $apkPath" -ForegroundColor Cyan
            Write-Host "📊 Tamanho: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Cyan
            
            # Copiar APK para pasta principal
            Copy-Item $apkPath "FactoryControl-App.apk"
            Write-Host "📱 APK copiado para: FactoryControl-App.apk" -ForegroundColor Green
            
            Write-Host ""
            Write-Host "📋 COMO INSTALAR NO ANDROID:" -ForegroundColor Yellow
            Write-Host "1. Copie FactoryControl-App.apk para o telemóvel" -ForegroundColor White
            Write-Host "2. No Android: Configurações → Segurança → Origens Desconhecidas → Ativar" -ForegroundColor White
            Write-Host "3. Toque no ficheiro APK para instalar" -ForegroundColor White
            Write-Host "4. Procure 'FactoryControl' no menu de apps" -ForegroundColor White
            
            $apkFound = $true
            break
        }
    }

    if (!$apkFound) {
        Write-Host "❌ APK não encontrado nos locais esperados" -ForegroundColor Red
        Write-Host "💡 Verifique a pasta cordova-app\platforms\android\" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Erro na geração do APK" -ForegroundColor Red
    Write-Host "💡 Verifique se tem Android SDK configurado" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Processo concluído" -ForegroundColor Green
