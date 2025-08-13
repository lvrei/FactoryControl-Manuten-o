@echo off
echo FactoryControl - Gerador APK Simples
echo ====================================
echo.

echo Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado
    echo Instale de: https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js encontrado

echo.
echo Instalando Cordova globalmente...
npm install -g cordova
if %errorlevel% neq 0 (
    echo ERRO: Falha na instalacao do Cordova
    pause
    exit /b 1
)

echo.
echo Fazendo build da aplicacao...
call npm run build:client
if %errorlevel% neq 0 (
    echo ERRO: Falha no build
    pause
    exit /b 1
)

echo.
echo Verificando ficheiros gerados...
if not exist "dist\spa\index.html" (
    echo ERRO: index.html nao encontrado em dist\spa\
    pause
    exit /b 1
)

echo.
echo Criando projeto Cordova...
if exist "cordova-app" (
    rmdir /s /q "cordova-app"
)

cordova create cordova-app com.factorycontrol.maintenance FactoryControl
if %errorlevel% neq 0 (
    echo ERRO: Falha ao criar projeto Cordova
    pause
    exit /b 1
)

echo.
echo Copiando ficheiros...
cd cordova-app
rmdir /s /q www
xcopy ..\dist\spa www\ /e /i /h /q
if %errorlevel% neq 0 (
    echo ERRO: Falha ao copiar ficheiros
    cd ..
    pause
    exit /b 1
)

echo.
echo Adicionando plataforma Android...
cordova platform add android
if %errorlevel% neq 0 (
    echo AVISO: Problema ao adicionar plataforma Android
)

echo.
echo Verificando Java...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Java nao encontrado
    echo Instale Java JDK de: https://adoptium.net/
    cd ..
    pause
    exit /b 1
)

echo.
echo Gerando APK... (isto pode demorar varios minutos)
echo Por favor aguarde...
cordova build android

cd ..

echo.
echo Procurando APK gerado...
set APK_FOUND=0

if exist "cordova-app\platforms\android\app\build\outputs\apk\debug\app-debug.apk" (
    set APK_PATH=cordova-app\platforms\android\app\build\outputs\apk\debug\app-debug.apk
    set APK_FOUND=1
) else if exist "cordova-app\platforms\android\build\outputs\apk\debug\android-debug.apk" (
    set APK_PATH=cordova-app\platforms\android\build\outputs\apk\debug\android-debug.apk
    set APK_FOUND=1
)

if %APK_FOUND%==1 (
    echo.
    echo *** APK GERADO COM SUCESSO! ***
    echo.
    echo Localizacao: %APK_PATH%
    copy "%APK_PATH%" "FactoryControl-App.apk"
    echo APK copiado para: FactoryControl-App.apk
    echo.
    echo COMO INSTALAR NO ANDROID:
    echo 1. Copie FactoryControl-App.apk para o telemovel
    echo 2. Android: Configuracoes - Seguranca - Origens Desconhecidas - Ativar
    echo 3. Toque no ficheiro APK para instalar
    echo 4. Procure "FactoryControl" no menu de apps
    echo.
    echo *** APK PRONTO PARA INSTALACAO! ***
) else (
    echo.
    echo ERRO: APK nao foi gerado
    echo Verifique a pasta cordova-app\platforms\android\
)

echo.
pause
