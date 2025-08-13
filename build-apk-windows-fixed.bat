@echo off
echo 🏭 FactoryControl - Gerador APK Windows
echo ========================================
echo.

echo 🔍 Verificando Java JDK...
if "%JAVA_HOME%"=="" (
    echo ❌ JAVA_HOME não definido
    echo 🔧 Executando configuração automática...
    call setup-java-windows.bat
    if %errorlevel% neq 0 (
        echo ❌ Falha na configuração Java
        pause
        exit /b 1
    )
    echo 🔄 Reinicie o terminal e execute novamente
    pause
    exit /b 0
)

echo ✅ JAVA_HOME: %JAVA_HOME%

"%JAVA_HOME%\bin\java" -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java não funciona corretamente
    echo 💡 Execute: setup-java-windows.bat
    pause
    exit /b 1
)

echo ✅ Java funcionando
echo.

echo 🔍 Verificando Android Studio...
where /q "studio64.exe" || where /q "studio.exe"
if %errorlevel% neq 0 (
    echo ⚠️ Android Studio não encontrado no PATH
    echo 💡 Instale de: https://developer.android.com/studio
    echo 📝 Continuando mesmo assim...
)

echo.
echo 🔨 Fazendo build da aplicação...
call npm run build:client
if %errorlevel% neq 0 (
    echo ❌ Erro no build da aplicação
    pause
    exit /b 1
)

echo ✅ Build da aplicação concluído
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

echo 🔧 Executando Gradle build...
echo ⏳ Isto pode demorar alguns minutos na primeira vez...
echo.

set JAVA_OPTS=-Xmx2g
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo.
    echo ❌ Erro na geração do APK
    echo.
    echo 💡 SOLUÇÕES:
    echo 1. Verifique se tem internet ^(Gradle precisa descarregar dependências^)
    echo 2. Execute: gradlew.bat clean
    echo 3. Tente novamente: gradlew.bat assembleDebug
    echo 4. Ou abra o projeto no Android Studio
    echo.
    pause
    exit /b 1
)

cd ..

echo.
echo 🎉 APK GERADO COM SUCESSO!
echo.

set APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk
if exist "%APK_PATH%" (
    echo ✅ APK encontrado: %APK_PATH%
    for %%I in ("%APK_PATH%") do (
        set /a SIZE_MB=%%~zI/1024/1024
        echo 📊 Tamanho: !SIZE_MB! MB
    )
    echo.
    echo 📱 COMO INSTALAR NO ANDROID:
    echo 1. Copie o ficheiro APK para o telemóvel
    echo 2. No Android: Configurações → Segurança → Origens Desconhecidas → Ativar
    echo 3. Toque no ficheiro APK para instalar
    echo 4. Procure "FactoryControl" no menu de apps
    echo.
    echo 🚀 APK pronto para instalação!
) else (
    echo ❌ APK não encontrado em: %APK_PATH%
    echo 💡 Verifique a pasta android\app\build\outputs\apk\debug\
)

echo.
pause
