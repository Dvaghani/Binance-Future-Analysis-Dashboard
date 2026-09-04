@echo off
title Stop Trading Analysis Platform
echo ========================================================
echo  Stopping Binance Futures Trading Intelligence Platform
echo ========================================================
echo.

echo Freeing Port 8000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Freeing Port 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo ========================================================
echo  Both services have been stopped.
echo ========================================================
timeout /t 2 >nul
