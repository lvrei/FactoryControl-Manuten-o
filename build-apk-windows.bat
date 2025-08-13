@echo off
echo 🏭 FactoryControl - Gerador APK Windows
echo ====================================
echo.

echo ���� Verificando se Android Studio está instalado...
where /q "studio64.exe" || where /q "studio.exe"
if %errorlevel% neq 0 (
    echo ❌ Android Studio não encontrado no PATH
    echo 💡 Instale Android Studio: https://developer.android.com/studio
    echo.
    pause
    exit /b 1
)

echo ✅ Android Studio encontrado
echo.

echo 🔍 Verificando Java...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java não encontrado
    echo 💡 Instale Java JDK 17+: https://adoptium.net/
    echo.
    pause
    exit /b 1
)

echo ✅ Java encontrado
echo.

echo 🔨 Fazendo build da aplicação...
call npm run build:client
if %errorlevel% neq 0 (
    echo ❌ Erro no build
    pause
    exit /b 1
)

echo ✅ Build concluído
echo.

echo ⚡ Configurando Capacitor...
call npx cap sync
if %errorlevel% neq 0 (
    echo ❌ Erro no Capacitor sync
    pause
    exit /b 1
)

echo ✅ Capacitor configurado
echo.

echo 🤖 Gerando APK...
cd android
if not exist "gradlew.bat" (
    echo ❌ gradlew.bat não encontrado
    echo 💡 Execute primeiro: npx cap add android
    pause
    exit /b 1
)

echo 🔧 Executando Gradle build (pode demorar alguns minutos)...
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo ❌ Erro na geração do APK
    echo 💡 Tente abrir o projeto no Android Studio
    pause
    exit /b 1
)

cd ..

echo.
echo 🎉 APK GERADO COM SUCESSO!
echo 📁 Localização: android\app\build\outputs\apk\debug\app-debug.apk
echo.

echo 📱 Para instalar no Android:
echo 1. Copie o ficheiro APK para o telemóvel
echo 2. Ative "Origens Desconhecidas" nas configurações
echo 3. Toque no ficheiro APK e instale
echo.

if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo ✅ APK confirmado: android\app\build\outputs\apk\debug\app-debug.apk
    for %%I in ("android\app\build\outputs\apk\debug\app-debug.apk") do echo 📊 Tamanho: %%~zI bytes
) else (
    echo ❌ APK não encontrado no local esperado
)

echo.
pause
