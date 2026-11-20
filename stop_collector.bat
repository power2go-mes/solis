@echo off
setlocal
cd /d "%~dp0"
echo ==============================================================
echo        Stopping Power2Go Solis Collector
echo ==============================================================

if exist logs\collector.pid (
    set /p PID=<logs\collector.pid
    echo Killing recorded PID: %PID%...
    taskkill /pid %PID% /t /f >nul 2>&1
    del logs\collector.pid >nul 2>&1
)

echo Terminating any running solis_auto_daemon or collector_guardian processes...
wmic process where "commandline like '%%collector_guardian.js%%'" call terminate >nul 2>&1
wmic process where "commandline like '%%solis_auto_daemon.js%%'" call terminate >nul 2>&1

echo [OK] Solis Collector stopped.
pause
