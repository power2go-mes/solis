@echo off
setlocal
cd /d "%~dp0"
echo ==============================================================
echo        Power2Go Solis Collector Status Check
echo ==============================================================

if exist logs\collector.pid (
    set /p PID=<logs\collector.pid
    echo [INFO] Recorded Guardian PID: %PID%
    tasklist /fi "PID eq %PID%" 2>nul | findstr /i "%PID%" >nul
    if %errorlevel% == 0 (
        echo [STATUS] Solis Collector Guardian is RUNNING (PID: %PID%)
    ) else (
        echo [STATUS] PID file exists but process %PID% is not active.
    )
) else (
    echo [STATUS] No PID file found in logs\collector.pid.
)

echo.
echo Process list for node.exe:
tasklist /fi "IMAGENAME eq node.exe"

echo.
echo --------------------------------------------------------------
echo Recent Log Entries (logs\solis_collector.log):
echo --------------------------------------------------------------
if exist logs\solis_collector.log (
    powershell -Command "Get-Content logs\solis_collector.log -Tail 20"
) else (
    echo No log file yet.
)
echo.
pause
