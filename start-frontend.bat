@echo off
cd /d "%~dp0frontend"
echo Starting Crypto Trader Frontend...
echo.
if not exist node_modules (
    echo Installing dependencies...
    npm install
)
echo Starting Next.js at http://localhost:3000
npm run dev
pause
