timeout /t 3

robocopy "%1" .
start "" ".\nw.exe"