@echo off
title Stop SolisCloud Daemon
color 0C
echo =========================================================================
echo    Stopping SolisCloud Automated Background Sync Daemon
echo =========================================================================
echo.

powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*solis_auto_daemon.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host 'Stopped Solis process PID:' $_.ProcessId }"

echo.
echo SolisCloud background daemon stopped successfully.
pause
