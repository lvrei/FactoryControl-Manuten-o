@echo off
echo ====================================================
echo FactoryControl - Configuracao Android Studio
echo ====================================================
echo.

echo 1. Procurando Android Studio...
set STUDIO_PATH=
set GRADLE_PATH=
set SDK_PATH=

:: Procurar Android Studio em locais comuns
for /d %%i in ("C:\Program Files\Android\Android Studio\*") do set STUDIO_PATH=%%i
for /d %%i in ("C:\Users\%USERNAME%\AppData\Local\Android\Sdk\*") do set SDK_PATH=%%i
for /d %%i in ("%LOCALAPPDATA%\Android\Sdk\*") do set SDK_PATH=%%i

:: Procurar SDK Android
if exist "%LOCALAPPDATA%\Android\Sdk" (
    set SDK_PATH=%LOCALAPPDATA%\Android\Sdk
    echo ✓ Android SDK encontrado: %SDK_PATH%
) else if exist "C:\Users\%USERNAME%\AppData\Local\Android\Sdk" (
    set SDK_PATH=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
    echo ✓ Android SDK encontrado: %SDK_PATH%
) else (
    echo ✗ Android SDK nao encontrado
)

:: Procurar Gradle
if exist "%SDK_PATH%\tools\bin\gradle.bat" (
    set GRADLE_PATH=%SDK_PATH%\tools\bin\gradle.bat
) else (
    :: Procurar Gradle do Android Studio
    for /f "delims=" %%i in ('dir /b /s "C:\Program Files\Android\Android Studio\gradle\gradle-*\bin\gradle.bat" 2^>nul') do set GRADLE_PATH=%%i
)

if "%GRADLE_PATH%"=="" (
    echo ✗ Gradle nao encontrado
    echo.
    echo SOLUCAO: Abra Android Studio uma vez e:
    echo 1. Vá em File → Settings → Build Tools → Gradle
    echo 2. Anote o caminho do Gradle
    echo 3. Execute: set PATH=%%PATH%%;[caminho-gradle]\bin
    echo.
    pause
    exit /b 1
) else (
    echo ✓ Gradle encontrado: %GRADLE_PATH%
)

echo.
echo 2. Configurando variaveis de ambiente...

if not "%SDK_PATH%"=="" (
    setx ANDROID_HOME "%SDK_PATH%" /M >nul 2>&1
    setx ANDROID_SDK_ROOT "%SDK_PATH%" /M >nul 2>&1
    echo ✓ ANDROID_HOME configurado
) else (
    echo ✗ Nao foi possivel configurar ANDROID_HOME
)

echo.
echo 3. Verificando Java...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Java nao encontrado
    echo Instale Java JDK de: https://adoptium.net/
    pause
    exit /b 1
) else (
    echo ✓ Java encontrado
)

echo.
echo 4. Testando Cordova build...
cd /d C:\Users\lvrei\cosmos-den\cordova-app

echo Definindo variaveis para esta sessao...
set ANDROID_HOME=%SDK_PATH%
set ANDROID_SDK_ROOT=%SDK_PATH%
set PATH=%PATH%;%SDK_PATH%\tools;%SDK_PATH%\platform-tools

echo.
echo Tentando build novamente...
cordova build android

if %errorlevel% eq 0 (
    echo.
    echo ========================================
    echo *** APK GERADO COM SUCESSO! ***
    echo ========================================
    
    cd ..
    
    if exist "cordova-app\platforms\android\app\build\outputs\apk\debug\app-debug.apk" (
        copy "cordova-app\platforms\android\app\build\outputs\apk\debug\app-debug.apk" "FactoryControl-App.apk"
        echo APK copiado para: FactoryControl-App.apk
        
        echo.
        echo PARA INSTALAR NO ANDROID:
        echo 1. Copie FactoryControl-App.apk para o telemovel
        echo 2. Android: Configuracoes → Seguranca → Origens Desconhecidas → Ativar
        echo 3. Toque no APK para instalar
        echo 4. Procure "FactoryControl" no menu
        echo.
        echo *** SUCESSO! ***
    ) else (
        echo Procurando APK em outros locais...
        for /r "cordova-app\platforms\android" %%f in (*.apk) do (
            echo Encontrado: %%f
            copy "%%f" "FactoryControl-App.apk"
            echo APK copiado para: FactoryControl-App.apk
        )
    )
) else (
    echo.
    echo ========================================
    echo ALTERNATIVA: Build Online
    echo ========================================
    echo.
    echo Se continua a nao funcionar, use servicos online:
    echo.
    echo 1. PhoneGap Build: https://build.phonegap.com/
    echo 2. Ionic Appflow: https://ionicframework.com/appflow
    echo 3. Adobe PhoneGap Build: https://build.phonegap.com/
    echo.
    echo Passos:
    echo 1. Comprima a pasta "cordova-app" em ZIP
    echo 2. Envie para um dos servicos acima
    echo 3. Eles geram o APK automaticamente
    echo.
)

echo.
pause
