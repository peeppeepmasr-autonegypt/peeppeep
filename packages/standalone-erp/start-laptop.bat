@echo off
title تشغيل معرض السيارات - نظام الكمبيوتر
cd /d "%~dp0"

echo ========================================================
echo        🚗 نظام إدارة معرض السيارات - نسخة الكمبيوتر
echo ========================================================
echo جاري تشغيل التطبيق في نافذة مستقلة...

:: Try launching in Edge App Mode (Clean window, no browser address bar)
where msedge >nul 2>nul
if %errorlevel% equ 0 (
    start msedge --app="%~dp0index.html"
    exit
)

:: Try launching in Chrome App Mode
where chrome >nul 2>nul
if %errorlevel% equ 0 (
    start chrome --app="%~dp0index.html"
    exit
)

:: Fallback to default browser
start "" "%~dp0index.html"
exit
