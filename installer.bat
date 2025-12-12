@echo off
setlocal

set "URL=https://github.com/woidzero/aotyfy/raw/main/aotyfy.js"

set "TARGET=%APPDATA%\spicetify\Extensions"

if not exist "%TARGET%" (
    mkdir "%TARGET%"
)

powershell -Command "Invoke-WebRequest -Uri '%URL%' -OutFile '%TARGET%\aotyfy.js'"

echo AOTYFY installed.
pause
