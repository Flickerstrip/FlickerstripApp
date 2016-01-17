timeout /t 5

robocopy "%1" .
start "" ".\nw.exe"
