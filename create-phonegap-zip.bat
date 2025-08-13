@echo off
echo ====================================================
echo FactoryControl - Criar ZIP para PhoneGap Build
echo ====================================================
echo.

echo 1. Instalando Cordova...
npm install -g cordova >nul 2>&1

echo 2. Fazendo build da aplicacao...
call npm run build:client
if %errorlevel% neq 0 (
    echo ERRO: Falha no build
    pause
    exit /b 1
)

echo 3. Verificando ficheiros...
if not exist "dist\spa\index.html" (
    echo ERRO: Build nao gerou ficheiros corretos
    pause
    exit /b 1
)

echo 4. Criando projeto Cordova...
if exist "cordova-app" rmdir /s /q "cordova-app"
cordova create cordova-app com.factorycontrol.maintenance FactoryControl >nul

echo 5. Copiando ficheiros da aplicacao...
cd cordova-app
rmdir /s /q www >nul 2>&1
xcopy ..\dist\spa www\ /e /i /h /q >nul

echo 6. Configurando para Android...
echo ^<?xml version='1.0' encoding='utf-8'^?^> > config.xml
echo ^<widget id="com.factorycontrol.maintenance" version="1.0.0" xmlns="http://www.w3.org/ns/widgets"^> >> config.xml
echo     ^<name^>FactoryControl^</name^> >> config.xml
echo     ^<description^>Sistema de Gestao de Manutencao Industrial^</description^> >> config.xml
echo     ^<content src="index.html" /^> >> config.xml
echo     ^<platform name="android"^> >> config.xml
echo         ^<preference name="android-minSdkVersion" value="22" /^> >> config.xml
echo         ^<preference name="android-targetSdkVersion" value="33" /^> >> config.xml
echo     ^</platform^> >> config.xml
echo     ^<access origin="*" /^> >> config.xml
echo ^</widget^> >> config.xml

echo 7. Removendo ficheiros desnecessarios...
if exist "platforms" rmdir /s /q platforms >nul 2>&1
if exist "plugins" rmdir /s /q plugins >nul 2>&1

echo 8. Criando ZIP para upload...
cd ..
powershell -command "if (Test-Path 'FactoryControl-PhoneGap.zip') { Remove-Item 'FactoryControl-PhoneGap.zip' }; Compress-Archive -Path 'cordova-app\*' -DestinationPath 'FactoryControl-PhoneGap.zip'"

if exist "FactoryControl-PhoneGap.zip" (
    echo.
    echo ================================================
    echo *** ZIP CRIADO COM SUCESSO! ***
    echo ================================================
    echo.
    echo Ficheiro: FactoryControl-PhoneGap.zip
    echo.
    echo PROXIMOS PASSOS:
    echo.
    echo 1. Acesse: https://build.phonegap.com/
    echo 2. Registe-se gratuitamente
    echo 3. Clique "Upload a .zip file"
    echo 4. Selecione FactoryControl-PhoneGap.zip
    echo 5. Clique "Ready to build"
    echo 6. Selecione "Android"
    echo 7. Aguarde build automatico
    echo 8. Download do APK final
    echo.
    echo ALTERNATIVAS SE PHONEGAP NAO FUNCIONAR:
    echo - Monaca: https://monaca.io/
    echo - Ionic Appflow: https://ionicframework.com/appflow
    echo.
    echo *** APK SERA GERADO AUTOMATICAMENTE! ***
    echo.
) else (
    echo ERRO: Nao foi possivel criar o ZIP
)

pause
