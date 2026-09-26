@echo off
chcp 65001 >nul
cls
echo ================================================================
echo    📅 KALENDÁŘ SMĚN — Sestavení samostatného instalačního APK
echo ================================================================
echo.

:: 1. Kontrola TypeScriptu
echo [1/3] Kontrola TypeScript kódu...
call npx tsc --noEmit
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ CHYBA: V kódu jsou chyby TypeScriptu. Opravte je před sestavením.
    pause
    exit /b %ERRORLEVEL%
)
echo      ✓ TypeScript je bez chyb!
echo.

:: 2. Kontrola přihlášení do EAS
echo [2/3] Kontrola přihlášení k Expo / EAS účtu...
call npx eas whoami >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  Nejste přihlášeni k účtu Expo.
    echo    Pokud ještě nemáte účet, můžete se zdarma zaregistrovat na https://expo.dev
    echo    nebo postupujte podle pokynů níže:
    echo.
    call npx eas login
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ❌ Přihlášení se nezdařilo.
        pause
        exit /b %ERRORLEVEL%
    )
)
echo      ✓ Přihlášení k EAS je v pořádku!
echo.

:: 3. Spuštění sestavení APK
echo [3/3] Spouštím cloudové sestavení Android APK (profil preview)...
echo      Tento proces probíhá v cloudu na serverech Expo a trvá cca 3-8 minut.
echo.
call npx eas build -p android --profile preview

echo.
echo ================================================================
echo    Dokončeno! Odkaz ke stažení .apk naleznete ve výpisu výše.
echo ================================================================
echo.
pause
