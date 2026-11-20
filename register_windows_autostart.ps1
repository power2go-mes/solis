# ==============================================================================
# Power2Go Solis Collector Auto-Start Registration
# No Administrator Privileges Required - Runs Unattended on Windows Startup
# ==============================================================================

$projectDir = "C:\Users\izhar\Desktop\soliscloud-one-time-test"
$vbsPath = Join-Path $projectDir "start_collector_silently.vbs"
$startupFolder = [System.IO.Path]::Combine($env:APPDATA, "Microsoft\Windows\Start Menu\Programs\Startup")
$startupVbs = Join-Path $startupFolder "StartSolisCollector.vbs"

Write-Host "Registering Power2Go Solis Collector for Windows Auto-Start..." -ForegroundColor Cyan

# 1. Place runner in Windows Startup Folder (runs on every user login)
try {
    Copy-Item -Path $vbsPath -Destination $startupVbs -Force
    Write-Host "[OK] Copied to Startup Folder: $startupVbs" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Startup folder copy error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 2. Add to HKCU Registry Run Key (Windows boots straight into this without prompt)
try {
    $regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
    $regValue = "wscript.exe `"$vbsPath`""
    Set-ItemProperty -Path $regPath -Name "Power2GoSolisCollector" -Value $regValue
    Write-Host "[OK] Registered in HKCU Registry Run: $regValue" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Registry run error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`nPower2Go Solis Collector is now registered to start automatically with Windows!" -ForegroundColor Green
Write-Host "No manual intervention or admin permission is needed." -ForegroundColor Green
