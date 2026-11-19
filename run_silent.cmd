@echo off
cd /d "C:\Users\izhar\Desktop\soliscloud-one-time-test"
:loop
node solis_auto_daemon.js >> daemon.log 2>&1
timeout /t 10 /nobreak >nul
goto loop
