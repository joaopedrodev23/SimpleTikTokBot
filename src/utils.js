const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ANSI Colors para acessibilidade e clareza no terminal
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m'
};

/**
 * Retorna horário atual formatado no padrão [HH:MM:SS]
 */
function getTimestamp() {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

/**
 * Log formatado e colorido com timestamp
 */
const log = {
  info: (msg) => console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.cyan}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.green}[SUCESSO]${colors.reset} ${msg}`),
  follow: (msg) => console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.magenta}[SEGUINDO]${colors.reset} ${msg}`),
  unfollow: (msg) => console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.yellow}[UNFOLLOW]${colors.reset} ${msg}`),
  like: (msg) => console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.red}[CURTIR]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.yellow}${colors.bold}[AVISO]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.red}${colors.bold}[ERRO]${colors.reset} ${msg}`),
  header: (title) => {
    const line = '═'.repeat(60);
    console.log(`\n${colors.cyan}${colors.bold}${line}`);
    console.log(`  ${title}`);
    console.log(`${line}${colors.reset}\n`);
  }
};

/**
 * Espera assíncrona com atraso em milissegundos
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gera um número aleatório entre min e max (inclusivo)
 */
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pausa humanizada com variação natural (jitter)
 */
async function humanDelay(secondsMin = 25, secondsMax = 55, reason = 'Aguardando intervalo seguro...') {
  const waitTime = randomBetween(secondsMin * 1000, secondsMax * 1000);
  const waitSeconds = (waitTime / 1000).toFixed(1);
  log.info(`${reason} (${waitSeconds}s)`);
  await sleep(waitTime);
}

/**
 * Toca alerta sonoro de acessibilidade (ajuda usuários com deficiência visual)
 */
function playChime(type = 'default') {
  try {
    if (process.platform === 'win32') {
      if (type === 'alert') {
        exec('powershell -c "[System.Console]::Beep(800, 300); [System.Console]::Beep(1000, 300)"');
      } else if (type === 'done') {
        exec('powershell -c "[System.Console]::Beep(1000, 200); [System.Console]::Beep(1200, 200)"');
      } else {
        process.stdout.write('\x07');
      }
    } else {
      process.stdout.write('\x07');
    }
  } catch (e) {
    // Silencioso se áudio não estiver disponível
  }
}

/**
 * Lê arquivo de configuração ou cria padrão
 */
function loadConfig() {
  const configPath = path.resolve(__dirname, '../config.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    log.warn('Não foi possível ler config.json, usando valores padrão.');
  }
  return {
    headless: false,
    minDelaySeconds: 25,
    maxDelaySeconds: 55,
    maxFollowsPerRun: 30,
    likeRecentVideos: true,
    unfollowAfterDays: 3,
    unfollowLimitPerRun: 30,
    audioNotifications: true,
    highContrast: true
  };
}

/**
 * Lê lista de alvos de targets.txt
 */
function loadTargets() {
  const targetsPath = path.resolve(__dirname, '../targets.txt');
  if (!fs.existsSync(targetsPath)) {
    return [];
  }
  const content = fs.readFileSync(targetsPath, 'utf8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.replace(/^@/, '')); // remove @ inicial para padronizar
}

module.exports = {
  colors,
  log,
  sleep,
  randomBetween,
  humanDelay,
  playChime,
  loadConfig,
  loadTargets
};

