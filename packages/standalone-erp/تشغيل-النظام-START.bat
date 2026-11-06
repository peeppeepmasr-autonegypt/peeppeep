@echo off
chcp 65001 >nul
title تشغيل نظام محمد السيد - Mohamed Elsayed Solution
color 0b

echo ========================================================
echo    نظام محمد السيد لإدارة معارض السيارات والحسابات
echo    Mohamed Elsayed Solution — Standalone Copy
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] فحص خادم Node.js المحلي...
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo     تشغيل الخادم المحلي على المنفذ 8080...
    start /min "Mostasharak Local Server" cmd /c "node serve.js"
    timeout /t 2 >nul
    echo [2/2] فتح بوابة النظام في المتصفح...
    start http://localhost:8080/START-PORTAL.html
) else (
    echo     تنبيه: Node.js غير مثبت كخدمة عامة، يتم فتح النظام بوضع الاستقلال الكامل المباشر...
    echo [2/2] فتح بوابة النظام مباشرة في المتصفح...
    start "" "%~dp0START-PORTAL.html"
)

echo.
echo ========================================================
echo    النظام يعمل الآن بنجاح!
echo    يمكنك إغلاق هذه النافذة في أي وقت.
echo ========================================================
timeout /t 5 >nul
exit
