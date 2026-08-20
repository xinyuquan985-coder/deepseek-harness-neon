@echo off
setlocal EnableExtensions
set "PROJECT_ROOT=%~dp0"
set "DSH_HOME=%PROJECT_ROOT%.dsh-home"

cd /d "%PROJECT_ROOT%" || exit /b 1

where node >nul 2>&1 || (
  echo [Neon Harness] Node.js 22.19 or newer is required.
  exit /b 1
)

where pnpm >nul 2>&1 || (
  echo [Neon Harness] pnpm is required. Install it, then run this launcher again.
  exit /b 1
)

echo [Neon Harness] Installing locked dependencies...
call pnpm install --frozen-lockfile
if errorlevel 1 exit /b 1

echo [Neon Harness] Building the runnable Host and Neon frontend...
call pnpm run build:runtime
if errorlevel 1 exit /b 1

echo [Neon Harness] Starting http://127.0.0.1:3080 ...
call pnpm dsh web %*
