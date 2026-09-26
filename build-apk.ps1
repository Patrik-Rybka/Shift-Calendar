# ================================================================
#    📅 KALENDÁŘ SMĚN — Sestavení samostatného instalačního APK
# ================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   📅 KALENDÁŘ SMĚN — Sestavení samostatného instalačního APK" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kontrola TypeScriptu
Write-Host "[1/3] Kontrola TypeScript kódu..." -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ CHYBA: V kódu jsou chyby TypeScriptu. Opravte je před sestavením." -ForegroundColor Red
    pause
    exit $LASTEXITCODE
}
Write-Host "     ✓ TypeScript je bez chyb!" -ForegroundColor Green
Write-Host ""

# 2. Kontrola přihlášení do EAS
Write-Host "[2/3] Kontrola přihlášení k Expo / EAS účtu..." -ForegroundColor Cyan
$whoami = npx eas whoami 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠️  Nejste přihlášeni k účtu Expo." -ForegroundColor Yellow
    Write-Host "   Pokud ještě nemáte účet, můžete se zdarma zaregistrovat na https://expo.dev" -ForegroundColor White
    Write-Host "   nebo se přihlaste v následujícím dialogu:`n" -ForegroundColor White
    npx eas login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Přihlášení se nezdařilo." -ForegroundColor Red
        pause
        exit $LASTEXITCODE
    }
}
Write-Host "     ✓ Přihlášení k EAS je v pořádku!" -ForegroundColor Green
Write-Host ""

# 3. Spuštění sestavení APK
Write-Host "[3/3] Spouštím cloudové sestavení Android APK (profil preview)..." -ForegroundColor Cyan
Write-Host "     Tento proces probíhá v cloudu na serverech Expo a trvá cca 3-8 minut.`n" -ForegroundColor Gray
npx eas build -p android --profile preview

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "   Dokončeno! Odkaz ke stažení .apk naleznete ve výpisu výše." -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
pause
