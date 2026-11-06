@echo off
chcp 65001 >nul
title نظام إدارة تحديثات عملاء معرض السيارات
cd /d "%~dp0"

:MENU
cls
echo.
echo ════════════════════════════════════════════════════════
echo    🚗 نظام إدارة التحديثات - معرض السيارات
echo ════════════════════════════════════════════════════════
echo.
echo   [1] عرض قائمة جميع العملاء المسجلين
echo   [2] إضافة عميل / معرض جديد
echo   [3] إرسال تحديث لعميل واحد محدد
echo   [4] إرسال تحديث شامل لجميع العملاء
echo   [5] حذف عميل من السجل
echo   [6] خروج
echo.
echo ════════════════════════════════════════════════════════
set /p CHOICE="  اختر رقم العملية: "

if "%CHOICE%"=="1" (
    node update-manager.js list
    pause
    goto MENU
)
if "%CHOICE%"=="2" (
    node update-manager.js add
    pause
    goto MENU
)
if "%CHOICE%"=="3" (
    set /p CLIENT_ID="  أدخل اسم العميل أو الـ ID: "
    node update-manager.js update "%CLIENT_ID%"
    pause
    goto MENU
)
if "%CHOICE%"=="4" (
    echo.
    echo ⚠️  سيتم توليد حزمة تحديث مخصصة لكل عميل في السجل...
    echo.
    node update-manager.js update-all
    pause
    goto MENU
)
if "%CHOICE%"=="5" (
    set /p CLIENT_ID="  أدخل اسم العميل أو الـ ID للحذف: "
    node update-manager.js remove "%CLIENT_ID%"
    pause
    goto MENU
)
if "%CHOICE%"=="6" exit
goto MENU
