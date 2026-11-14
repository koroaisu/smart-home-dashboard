@echo off
cd /d "%~dp0"
set "PORT=5173"
where node >nul 2>nul
if %errorlevel% equ 0 (
  node scripts/build-figma-preview.mjs && node server.mjs
) else if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts/build-figma-preview.mjs && "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.mjs
) else (
  echo Node.js was not found. Please install Node.js to run this app.
)
pause
