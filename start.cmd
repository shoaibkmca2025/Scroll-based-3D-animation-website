@echo off
REM Double-click this file to run the ClearNest React site.
cd /d "%~dp0react"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Get it from https://nodejs.org and run this again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies, one moment...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo Install failed. See the messages above.
    pause
    exit /b 1
  )
)

echo.
echo Starting ClearNest on http://localhost:5173
echo Press Ctrl+C in this window to stop it.
echo.
call npm run dev -- --open
pause
