@echo off
setlocal
cd /d "%~dp0"

:: Check for administrative rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges to register Windows Service...
    powershell -Command "Start-Process cmd -ArgumentList '/c """%~f0"""' -Verb RunAs"
    exit /b
)

echo ==============================================================
echo    Registering Power2Go Solis Collector as Windows Service
echo ==============================================================

set "TASK_NAME=Power2GoSolisCollector"
set "NODE_PATH=C:\Program Files\nodejs\node.exe"
set "GUARDIAN_PATH=%~dp0collector_guardian.js"

:: 1. Register Task Scheduler Service that runs at system boot and logon with highest privileges
schtasks /create /tn "%TASK_NAME%" /tr "\"%NODE_PATH%\" \"%GUARDIAN_PATH%\"" /sc onstart /ru "SYSTEM" /rl highest /f >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Registered system-level startup service in Windows Task Scheduler (Runs as SYSTEM at boot).
) else (
    :: Fallback to user logon with highest privileges
    schtasks /create /tn "%TASK_NAME%" /tr "\"%NODE_PATH%\" \"%GUARDIAN_PATH%\"" /sc onlogon /rl highest /f
    echo [OK] Registered logon service in Windows Task Scheduler with highest privileges.
)

:: 2. Also register in Windows Registry Run for redundancy
powershell -ExecutionPolicy Bypass -File "%~dp0register_windows_autostart.ps1"

echo.
echo Starting service immediately...
schtasks /run /tn "%TASK_NAME%" >nul 2>&1

echo.
echo ==============================================================
echo [SUCCESS] Power2Go Solis Collector successfully registered!
echo It will now run 24/7 in the background without any prompt.
echo ==============================================================
echo.
pause
