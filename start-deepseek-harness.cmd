@echo off
setlocal
set "DSH_HOME=%~dp0.dsh-home"
cd /d "%~dp0"
call "%~dp0.dsh-runtime\node_modules\.bin\dsh.cmd" web %*
