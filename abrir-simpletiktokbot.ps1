# SimpleTikTokBot - Launcher em PowerShell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "SimpleTikTokBot - Automação TikTok Open Source"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Inicializando SimpleTikTokBot..." -ForegroundColor White
Write-Host "══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# 1. Verifica se o Node.js está instalado
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "`n[ERRO CRÍTICO] Node.js não foi encontrado no seu computador!" -ForegroundColor Red
    Write-Host "Para executar o robô, você precisa instalar o Node.js (gratuito e seguro)." -ForegroundColor Yellow
    Write-Host "Baixe a versão LTS em: https://nodejs.org/" -ForegroundColor Cyan
    Write-Host "`nApós instalar, feche esta janela e dê dois cliques no arquivo novamente.`n" -ForegroundColor White
    Read-Host "Pressione Enter para sair..."
    exit 1
}

# 2. Verifica se as dependências (node_modules) estão presentes
$modulesPath = Join-Path $ScriptDir "node_modules"
if (-not (Test-Path $modulesPath)) {
    Write-Host "`n[CONFIGURAÇÃO AUTOMÁTICA] Instalando módulos necessários pela primeira vez..." -ForegroundColor Yellow
    Write-Host "Isso pode levar de 30 a 60 segundos. Por favor aguarde...`n" -ForegroundColor Gray
    
    $npmProcess = Start-Process npm -ArgumentList "install --omit=dev" -NoNewWindow -Wait -PassThru
    if ($npmProcess.ExitCode -ne 0) {
        Write-Host "`n[ERRO] Falha ao instalar dependências via npm." -ForegroundColor Red
        Read-Host "Pressione Enter para sair..."
        exit 1
    }
    Write-Host "`n[SUCESSO] Dependências instaladas com sucesso!`n" -ForegroundColor Green
}

# 3. Executa o robô
try {
    node src/index.js
} catch {
    Write-Host "`n[ERRO NA EXECUÇÃO]: $_" -ForegroundColor Red
    Read-Host "Pressione Enter para continuar..."
    exit 1
}
