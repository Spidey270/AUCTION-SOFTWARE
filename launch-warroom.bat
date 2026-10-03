@echo off
setlocal
cd /d "E:\AuctionSoftware"
set PATH=C:\Users\arjun\.gemini\antigravity\scratch\tools\node-v20.18.0-win-x64;%PATH%

:: Check if server is already responding on 5173
powershell -Command "$client = New-Object System.Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 5173); exit 0 } catch { exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    start /min "AuctionWarRoomServer" cmd /c "node node_modules\vite\bin\vite.js preview --port 5173 --host 127.0.0.1"
    timeout /t 2 /nobreak >nul
)

:: Find Chrome or Edge to launch in desktop app mode
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="http://127.0.0.1:5173" --window-size=1680,980 --window-position=50,50
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="http://127.0.0.1:5173" --window-size=1680,980 --window-position=50,50
) else (
    start http://127.0.0.1:5173
)

