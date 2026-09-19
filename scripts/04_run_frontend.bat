@echo off
REM JalDrishti - starts the React + Vite frontend on port 5173.
cd /d "%~dp0..\frontend"

if not exist node_modules (
    echo Installing npm dependencies (first run only)...
    npm install
)

echo Starting Vite dev server on http://localhost:5173 ...
npm run dev
