%1
timeout /t 3

robocopy $src/* `pwd` /s /e
start "" ./nw.exe

