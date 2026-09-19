const fs = require('fs');
const path = require('path');
const readline = require('readline');
const selectors = require('./selectors');
const { log, sleep, playChime } = require('./utils');

const COOKIES_FILE = path.resolve(__dirname, '../cookies.json');

/**
 * Salva cookies da sessão atual em cookies.json
 */
async function saveCookies(page) {
  try {
    const cookies = await page.cookies();
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2), 'utf8');
    log.success('Cookies de sessão salvos com sucesso.');
    return true;
  } catch (err) {
    log.error(`Erro ao salvar cookies: ${err.message}`);
    return false;
  }
}

/**
 * Carrega cookies salvos previamente
 */
async function loadCookies(page) {
  try {
    if (fs.existsSync(COOKIES_FILE)) {
      const content = fs.readFileSync(COOKIES_FILE, 'utf8');
      const cookies = JSON.parse(content);
      if (Array.isArray(cookies) && cookies.length > 0) {
        await page.setCookie(...cookies);
        log.info('Cookies anteriores carregados.');
        return true;
      }
    }
  } catch (err) {
    log.warn(`Não foi possível restaurar cookies: ${err.message}`);
  }
  return false;
}

/**
 * Verifica se a sessão do TikTok está autenticada
 */
async function isLoggedIn(page) {
  try {
    // 1. Verifica se existe o cookie de sessão do TikTok
    const cookies = await page.cookies();
    const hasSessionCookie = cookies.some(c => 
      c.name === 'sessionid' || 
      c.name === 'sessionid_ss' || 
      c.name === 'sid_guard'
    );

    if (hasSessionCookie) {
      return true;
    }

    // 2. Verifica elementos visuais no DOM
    for (const selector of selectors.login.avatarIcon) {
      const el = await page.$(selector);
      if (el) return true;
    }

    return false;
  } catch (err) {
    return false;
  }
}

/**
 * Garante que o usuário esteja logado antes de prosseguir com as automações
 */
async function ensureLogin(page) {
  log.info('Verificando status de login no TikTok...');
  await loadCookies(page);

  await page.goto('https://www.tiktok.com/', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await sleep(3000);

  const logged = await isLoggedIn(page);
  if (logged) {
    log.success('Conta autenticada no TikTok com sucesso!');
    await saveCookies(page);
    return true;
  }

  // Se não estiver logado, guia o usuário de forma clara e acessível
  log.header('LOGIN NECESSÁRIO NO TIKTOK');
  console.log('  1. Uma janela do navegador foi aberta para você.');
  console.log('  2. Faça login na sua conta do TikTok normalmente.');
  console.log('  3. O bot detectará seu login automaticamente e salvará a sessão.\n');
  playChime('alert');

  // Loop de monitoramento de login automático
  const maxWaitMinutes = 5;
  const startTime = Date.now();
  const maxWaitMs = maxWaitMinutes * 60 * 1000;

  while (Date.now() - startTime < maxWaitMs) {
    await sleep(3000);
    const checkLogged = await isLoggedIn(page);
    if (checkLogged) {
      console.log('\n');
      log.success('Login detectado com sucesso!');
      playChime('done');
      await sleep(2000);
      await saveCookies(page);
      return true;
    }
  }

  log.warn('Tempo limite para login expirado (5 minutos).');
  return false;
}

module.exports = {
  saveCookies,
  loadCookies,
  isLoggedIn,
  ensureLogin,
  COOKIES_FILE
};

