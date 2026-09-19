@echo off
chcp 65001 >nul
title Importador de Sessao TikTok - SimpleTikTokBot

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%importar-sessao-tiktok.ps1"
pause
