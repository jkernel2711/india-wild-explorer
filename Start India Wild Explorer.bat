@echo off
title India Wild Explorer
rem Opens app\index.html in an Edge or Chrome window.
set "APP=%~dp0app\index.html"
if not exist "%APP%" (
  echo Could not find the app folder next to this file.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%U in (`powershell -NoProfile -Command "[uri]::new($env:APP).AbsoluteUri"`) do set "URL=%%U"
if not defined URL set "URL=%APP%"

set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if exist "%EDGE%" (
  start "" "%EDGE%" --app="%URL%" --start-maximized
) else if exist "%CHROME%" (
  start "" "%CHROME%" --app="%URL%" --start-maximized
) else (
  start "" "%APP%"
)
exit /b 0