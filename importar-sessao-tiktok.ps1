# SimpleTikTokBot - Importador de Sessão / Cookie do TikTok
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CookiesFile = Join-Path $ScriptDir "cookies.json"

Clear-Host
Write-Host "══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "       IMPORTADOR DE SESSÃO DO TIKTOK - SimpleTikTokBot" -ForegroundColor White
Write-Host "══════════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "Este utilitário permite que você insira o seu 'sessionid' do TikTok diretamente," -ForegroundColor Gray
Write-Host "evitando a necessidade de resolver CAPTCHAs no navegador automatizado.`n" -ForegroundColor Gray

Write-Host "Como pegar o seu sessionid no Chrome ou Edge:" -ForegroundColor Yellow
Write-Host "  1. Acesse https://www.tiktok.com no seu navegador normal logado." -ForegroundColor White
Write-Host "  2. Pressione F12 -> Aba 'Aplicativo' (Application) -> Cookies -> https://www.tiktok.com" -ForegroundColor White
Write-Host "  3. Encontre o cookie de nome 'sessionid' e copie o seu valor.`n" -ForegroundColor White

$sessionId = Read-Host "Cole aqui o valor do seu sessionid (ou pressione Enter para cancelar)"

if ([string]::IsNullOrWhiteSpace($sessionId)) {
    Write-Host "`nOperação cancelada." -ForegroundColor Yellow
    exit 0
}

$sessionId = $sessionId.Trim()

$cookieObject = @(
    @{
        name = "sessionid"
        value = $sessionId
        domain = ".tiktok.com"
        path = "/"
        httpOnly = $true
        secure = $true
    },
    @{
        name = "sessionid_ss"
        value = $sessionId
        domain = ".tiktok.com"
        path = "/"
        httpOnly = $true
        secure = $true
    }
)

$jsonContent = $cookieObject | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($CookiesFile, $jsonContent, [System.Text.Encoding]::UTF8)

Write-Host "`n✅ Cookies salvos com sucesso em: $CookiesFile" -ForegroundColor Green
Write-Host "Agora você já pode abrir o SimpleTikTokBot com sua conta autenticada!`n" -ForegroundColor Cyan
