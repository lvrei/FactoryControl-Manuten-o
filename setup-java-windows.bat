@echo off
echo 🔧 Configuração Java para Android APK
echo ====================================
echo.

echo 🔍 Verificando Java...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java não encontrado!
    echo.
    echo 📋 PASSOS PARA INSTALAR JAVA:
    echo 1. Acesse: https://adoptium.net/temurin/releases/
    echo 2. Descarregue: Windows x64 JDK 17 ^(ou superior^)
    echo 3. Instale normalmente
    echo 4. Execute este script novamente
    echo.
    pause
    exit /b 1
)

echo ✅ Java encontrado!
java -version

echo.
echo 🔍 Procurando instalação Java...

:: Procurar Java em locais comuns
set JAVA_PATHS=
for /d %%i in ("C:\Program Files\Eclipse Adoptium\*") do set JAVA_PATHS=!JAVA_PATHS! "%%i"
for /d %%i in ("C:\Program Files\Java\*") do set JAVA_PATHS=!JAVA_PATHS! "%%i"
for /d %%i in ("C:\Program Files\OpenJDK\*") do set JAVA_PATHS=!JAVA_PATHS! "%%i"
for /d %%i in ("C:\Program Files (x86)\Eclipse Adoptium\*") do set JAVA_PATHS=!JAVA_PATHS! "%%i"

:: Encontrar o Java mais recente
set JAVA_DIR=
for %%i in (%JAVA_PATHS%) do (
    if exist "%%~i\bin\java.exe" (
        set JAVA_DIR=%%~i
        echo 📁 Java encontrado em: %%~i
    )
)

if "%JAVA_DIR%"=="" (
    echo ❌ Diretório Java não encontrado automaticamente
    echo 💡 Instale Java JDK de: https://adoptium.net/
    pause
    exit /b 1
)

echo ✅ Usando Java: %JAVA_DIR%
echo.

echo 🔧 Configurando variáveis de ambiente...

:: Configurar JAVA_HOME para o utilizador atual
setx JAVA_HOME "%JAVA_DIR%" >nul
if %errorlevel% equ 0 (
    echo ✅ JAVA_HOME configurado: %JAVA_DIR%
) else (
    echo ❌ Erro ao configurar JAVA_HOME
)

:: Adicionar ao PATH
echo %PATH% | find /i "%JAVA_DIR%\bin" >nul
if %errorlevel% neq 0 (
    setx PATH "%PATH%;%JAVA_DIR%\bin" >nul
    if %errorlevel% equ 0 (
        echo ✅ Java adicionado ao PATH
    ) else (
        echo ❌ Erro ao adicionar Java ao PATH
    )
) else (
    echo ✅ Java já está no PATH
)

echo.
echo 🎉 Configuração concluída!
echo.
echo 📋 PRÓXIMOS PASSOS:
echo 1. Feche e reabra o PowerShell/CMD
echo 2. Execute: npm run build:apk
echo 3. Ou execute: npm run build:apk:windows
echo.

echo 🧪 Testando configuração atual...
set JAVA_HOME=%JAVA_DIR%
set PATH=%PATH%;%JAVA_DIR%\bin

echo JAVA_HOME=%JAVA_HOME%
echo.
"%JAVA_HOME%\bin\java" -version
echo.

echo ✅ Se aparecer a versão Java acima, está tudo correto!
echo 🔄 Reinicie o terminal e tente gerar APK novamente
echo.
pause
