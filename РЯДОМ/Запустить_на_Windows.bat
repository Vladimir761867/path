@echo off
cd /d "%~dp0"
start "Рядом - локальный сервер" cmd /k py -m http.server 4173 --directory "01_Прототип\dist"
timeout /t 2 >nul
start "" "http://localhost:4173"
