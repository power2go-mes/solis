Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\izhar\Desktop\soliscloud-one-time-test"
WshShell.Run "cmd /c run_silent.cmd", 0, False
