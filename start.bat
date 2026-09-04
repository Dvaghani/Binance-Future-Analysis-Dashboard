@echo off
title Launch Trading Analysis Platform
echo ========================================================
echo  Starting Binance Futures Trading Intelligence Platform
echo ========================================================
echo.

echo Starting Backend (FastAPI on http://127.0.0.1:8000)...
start "Backend - FastAPI" cmd /k "python -m backend.main"

timeout /t 2 /nobreak >nul

echo Starting Frontend (Vite on http://localhost:5173)...
cd /d "%~dp0frontend"
start "Frontend - React" cmd /k "npm run dev"

echo.
echo ========================================================
echo  Both services launched!
echo  Access Dashboard at: http://localhost:5173
echo  API Documentation at: http://127.0.0.1:8000/docs
echo ========================================================
