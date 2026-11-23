$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument 'C:\Users\izhar\Desktop\soliscloud-one-time-test\start_collector_silently.vbs'
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'Power2GoSolisCollector_Watchdog' -Action $action -Trigger $trigger -Settings $settings -Force
Write-Host "Watchdog scheduled successfully!"
