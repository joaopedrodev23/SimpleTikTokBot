const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { log } = require('./utils');

// Ativa evasões de detecção do plugin Stealth
puppeteer.use(StealthPlugin());

/**
 * Procura um navegador Chromium compatível instalado no sistema (Chrome ou Edge)
 */
function findSystemBrowser() {
  const isWin = process.platform === 'win32';
  if (!isWin) return null;

  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const candidatePaths = [
    path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe')
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Inicializa a instância do navegador com proteções anti-bot
 */
async function initBrowser(options = {}) {
  const { headless = false } = options;

  // Diretório do perfil persistente (salva cache e sessões de forma segura)
  const userDataDir = path.resolve(__dirname, '../user_data');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  const systemChrome = findSystemBrowser();
  if (systemChrome) {
    log.info(`Navegador detectado: ${path.basename(systemChrome)}`);
  }

  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--window-size=1280,850',
    '--start-maximized',
    '--lang=pt-BR,pt,en-US,en'
  ];

  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    executablePath: systemChrome || undefined,
    userDataDir,
    args: launchArgs,
    defaultViewport: null,
    ignoreDefaultArgs: ['--enable-automation']
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  // Configura User-Agent moderno e cabeçalhos realistas
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
  });

  return { browser, page };
}

module.exports = {
  initBrowser,
  findSystemBrowser
};

