@echo off
chcp 65001 >nul
title منظومة مستشارك (Mostasharak) — التثبيت والتشغيل السريع
color 0A

echo ======================================================================
echo    🚗  منظومة مستشارك (Mostasharak) لإدارة المعارض وسوق السيارات
echo    النسخة السحابية المعتمدة | autofyon@gmail.com | 01222597304
echo ======================================================================
echo.
echo  اختر العملية المطلوبة لتشغيلها على هذا الجهاز:
echo.
echo  [1] تشغيل نظام المحاسبة والإدارة المالية (Accounting ERP)
echo  [2] تشغيل تطبيق سوق ومعرض السيارات (Marketplace)
echo  [3] فتح معالج التثبيت الذكي لكافة الأجهزة (Universal Installer)
echo  [4] إنشاء اختصارات رسمية على سطح المكتب لكلا التطبيقين (Desktop Shortcuts)
echo  [5] تشغيل سيرفر الربط والمزامنة المحلي (Local Wi-Fi Server)
echo  [0] خروج
echo.
echo ======================================================================
set /p choice="أدخل رقم الاختيار (1-5): "

if "%choice%"=="1" (
    echo جاري فتح نظام المحاسبة...
    start "" "%~dp0mostasharak-accounting.html"
    exit /b
)

if "%choice%"=="2" (
    echo جاري فتح سوق السيارات...
    start "" "%~dp0mostasharak-market.html"
    exit /b
)

if "%choice%"=="3" (
    echo جاري فتح معالج التثبيت الذكي...
    start "" "%~dp0install.html"
    exit /b
)

if "%choice%"=="4" (
    echo جاري إنشاء اختصارات سطح المكتب...
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $d = [System.Environment]::GetFolderPath('Desktop'); $s1 = $ws.CreateShortcut(\"$d\مستشارك - الحسابات والإدارة.lnk\"); $s1.TargetPath = \"$([System.IO.Path]::GetFullPath('%~dp0mostasharak-accounting.html'))\"; $s1.Save(); $s2 = $ws.CreateShortcut(\"$d\مستشارك - سوق السيارات.lnk\"); $s2.TargetPath = \"$([System.IO.Path]::GetFullPath('%~dp0mostasharak-market.html'))\"; $s2.Save(); Write-Host '✅ تم إنشاء اختصارات سطح المكتب بنجاح!'"
    pause
    exit /b
)

if "%choice%"=="5" (
    echo جاري تشغيل سيرفر المزامنة على الشبكة...
    node "%~dp0serve.js"
    pause
    exit /b
)

exit /b
