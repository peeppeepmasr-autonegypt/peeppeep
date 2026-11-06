@echo off
chcp 65001 >nul
title تجهيز حزمة مخصصة لعميل / معرض
cd /d "%~dp0"

echo ========================================================
echo        🚗 تجهيز حزمة مخصصة لعميل أو معرض سيارات
echo ========================================================
echo.
set /p COMP="أدخل اسم المعرض / الشركة (مثال: Auto One Egypt): "
if "%COMP%"=="" set COMP=Auto One Egypt

node package-client.js "%COMP%"
echo.
pause
