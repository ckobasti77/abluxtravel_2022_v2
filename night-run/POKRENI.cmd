@echo off
rem ABLux nocni run - dvoklik pokrece run. Radi sa ugradjenim Windows PowerShell 5.1 (PowerShell 7 se koristi ako postoji).
chcp 65001 >nul
cd /d "%~dp0.."
set "PS="
where pwsh >nul 2>nul && set "PS=pwsh"
if not defined PS if exist "%ProgramFiles%\PowerShell\7\pwsh.exe" set "PS=%ProgramFiles%\PowerShell\7\pwsh.exe"
if not defined PS set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
title ABLux nocni run
echo Pokrecem nocni run: "%PS%"
echo Ne zatvaraj ovaj prozor. Racunar ne sme da ide na spavanje (skripta to sama sprecava dok radi).
echo.
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%CD%\night-run\run.ps1" %*
echo.
echo Run je zavrsen ili zaustavljen. Pogledaj night-run\NIGHT_REPORT.md i night-run\logs\run.log
pause
