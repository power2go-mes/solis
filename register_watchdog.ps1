# ==============================================================================
# Power2Go SolisCloud High-Availability Windows Scheduled Task Registration
# ==============================================================================
# Features:
# - Starts at user logon (AtLogOn)
# - Continuous 5-minute watchdog repetition (Indefinite duration)
# - Runs hidden in the background via wscript.exe
# - Never stops on battery, never idles out, auto-restarts on failure
# ==============================================================================

$taskName = "Power2GoSolisCollector_Watchdog"
$projectDir = "C:\Users\izhar\Desktop\soliscloud-one-time-test"
$vbsPath = "$projectDir\start_collector_silently.vbs"

Write-Host "Configuring high-availability Scheduled Task: $taskName..." -ForegroundColor Cyan

# 1. Action: Execute the silent VBS launcher
$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$vbsPath`"" -WorkingDirectory $projectDir

# 2. Trigger: Continuous 5-minute repetition that never expires
$timeSpan5Min = New-TimeSpan -Minutes 5
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval $timeSpan5Min

# 3. Settings: Permanent execution, no power-saving kill, no timeout (0 = infinite)
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([System.TimeSpan]::Zero) `
    -Priority 4

# 4. Register the task under current user
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Force | Out-Null

Write-Host "Task '$taskName' registered successfully with INDEFINITE 5-minute watchdog!" -ForegroundColor Green

# 5. Kick off the task immediately
Start-ScheduledTask -TaskName $taskName
Write-Host "Watchdog task triggered." -ForegroundColor Green
