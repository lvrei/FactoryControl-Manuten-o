@echo off
echo ================================================
echo Preparar projeto para build online (PhoneGap)
echo ================================================
echo.

echo 1. Verificando estrutura do projeto...
if not exist "cordova-app" (
    echo Pasta cordova-app nao encontrada, criando automaticamente...
    echo.
    echo Instalando Cordova globalmente...
    npm install -g cordova
    echo.
    echo Fazendo build da aplicacao...
    call npm run build:client
    echo.
    echo Criando projeto Cordova...
    cordova create cordova-app com.factorycontrol.maintenance FactoryControl
    echo.
    echo Copiando ficheiros...
    cd cordova-app
    rmdir /s /q www
    xcopy ..\dist\spa www\ /e /i /h
    cd ..
    echo ✓ Projeto Cordova criado com sucesso
    echo.
)

cd cordova-app

echo 2. Limpando arquivos desnecessarios...
if exist "platforms" rmdir /s /q platforms
if exist "plugins" rmdir /s /q plugins
if exist "node_modules" rmdir /s /q node_modules

echo 3. Otimizando config.xml...
echo ^<?xml version='1.0' encoding='utf-8'^?^> > config.xml
echo ^<widget id="com.factorycontrol.maintenance" version="1.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0"^> >> config.xml
echo     ^<name^>FactoryControl^</name^> >> config.xml
echo     ^<description^>Sistema de Gestao de Manutencao Industrial^</description^> >> config.xml
echo     ^<author email="admin@factorycontrol.com"^>FactoryControl Team^</author^> >> config.xml
echo     ^<content src="index.html" /^> >> config.xml
echo     ^<allow-intent href="http://*/*" /^> >> config.xml
echo     ^<allow-intent href="https://*/*" /^> >> config.xml
echo     ^<platform name="android"^> >> config.xml
echo         ^<preference name="android-minSdkVersion" value="22" /^> >> config.xml
echo         ^<preference name="android-targetSdkVersion" value="33" /^> >> config.xml
echo     ^</platform^> >> config.xml
echo     ^<access origin="*" /^> >> config.xml
echo ^</widget^> >> config.xml

echo 4. Verificando arquivos necessarios...
if not exist "www\index.html" (
    echo Erro: www\index.html nao encontrado
    cd ..
    pause
    exit /b 1
)

echo 5. Criando ZIP para upload...
cd ..
powershell -command "Compress-Archive -Path 'cordova-app\*' -DestinationPath 'FactoryControl-PhoneGap.zip' -Force"

if exist "FactoryControl-PhoneGap.zip" (
    echo.
    echo ========================================
    echo *** ZIP CRIADO COM SUCESSO! ***
    echo ========================================
    echo.
    echo Arquivo: FactoryControl-PhoneGap.zip
    echo.
    echo PROXIMOS PASSOS:
    echo.
    echo OPCAO 1 - PhoneGap Build (Adobe):
    echo 1. Acesse: https://build.phonegap.com/
    echo 2. Faca login/registo gratuito
    echo 3. Carregue FactoryControl-PhoneGap.zip
    echo 4. Clique "Build" para Android
    echo 5. Descarregue o APK gerado
    echo.
    echo OPCAO 2 - Monaca (Alternativa):
    echo 1. Acesse: https://monaca.io/
    echo 2. Crie conta gratuita
    echo 3. Import project (ZIP)
    echo 4. Build para Android
    echo.
    echo OPCAO 3 - Ionic Appflow:
    echo 1. Acesse: https://ionicframework.com/appflow
    echo 2. Trial gratuito disponivel
    echo 3. Upload do ZIP
    echo 4. Native build Android
    echo.
    echo *** RECOMENDACAO: Use PhoneGap Build (mais simples) ***
    echo.
) else (
    echo Erro ao criar ZIP
)

pause
