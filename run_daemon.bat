@echo off
title Power2Go SolisCloud Daemon (15m Live Sync + 6h Audit)
color 0B

echo =========================================================================
echo    Power2Go SolisCloud Automated Background Daemon
echo    - 15-Minute Live Telemetry & 5-Min Curve Sync
echo    - 6-Hour Day 1 to Today Missing Data Audit & Backfill
echo =========================================================================
echo.

cd /d "%~dp0"

:start
echo [%date% %time%] Starting SolisCloud Daemon...
node solis_auto_daemon.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Daemon process stopped with code %ERRORLEVEL%.
    echo Restarting daemon in 10 seconds...
    timeout /t 10 /nobreak >nul
    goto :start
)

pause
