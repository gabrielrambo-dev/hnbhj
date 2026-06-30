@echo off
cd /d "%~dp0.."
echo Instalando dependencias...
call npm install
if errorlevel 1 pause && exit /b 1
echo Gerando instalador EXE...
call npm run dist
if errorlevel 1 pause && exit /b 1
echo Pronto. Veja a pasta release.
pause
