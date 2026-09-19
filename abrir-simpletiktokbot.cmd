@echo off
chcp 65001 >nul
title SimpleTikTokBot - Automação TikTok Open Source

echo.
echo ======================================================================
echo           SimpleTikTokBot - Automação Segura para TikTok
echo                   Open Source por João Pedro
echo ======================================================================
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%abrir-simpletiktokbot.ps1"
if %ERRORLEVEL% NEQ 0 goto :erro

goto :fim

:erro
echo.
echo ======================================================================
echo [AVISO] O processo foi finalizado ou ocorreu um erro.
echo Verifique a mensagem acima para obter mais detalhes.
echo ======================================================================
pause
exit /b 1

:fim
pause
exit /b 0
