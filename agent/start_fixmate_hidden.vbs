Set WshShell = CreateObject("WScript.Shell")

WshShell.CurrentDirectory = "C:\Users\JOSHUA\Downloads\final project\agent"

WshShell.Run """C:\Python314\python.exe"" ""C:\Users\JOSHUA\Downloads\final project\agent\main.py""", 0, False