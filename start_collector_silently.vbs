Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

strScriptDir = "C:\Users\izhar\Desktop\soliscloud-one-time-test"
WshShell.CurrentDirectory = strScriptDir
strCommand = """C:\Program Files\nodejs\node.exe"" """ & strScriptDir & "\collector_guardian.js"""

' 0 = Hide window completely, False = Do not wait for script to finish
WshShell.Run strCommand, 0, False
Set WshShell = Nothing
Set fso = Nothing
