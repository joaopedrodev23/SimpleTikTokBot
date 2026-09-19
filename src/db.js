const fs = require('fs');
const path = require('path');
const { log } = require('./utils');

const DATA_DIR = path.resolve(__dirname, '../data');
const FOLLOWED_FILE = path.join(DATA_DIR, 'followed.json');
const UNFOLLOWED_FILE = path.join(DATA_DIR, 'unfollowed.json');

// Garante que o diretório data/ existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Lê arquivo JSON de forma segura com fallback para array vazio
 */
function readJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    log.warn(`Erro ao ler ${path.basename(filePath)}, recriando banco local.`);
  }
  return [];
}

/**
 * Salva array em arquivo JSON formatado
 */
function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    log.error(`Falha ao salvar no banco ${path.basename(filePath)}: ${err.message}`);
  }
}

/**
 * Verifica se um usuário já foi seguido pelo robô
 */
function hasFollowed(username) {
  const cleanUser = username.toLowerCase().replace(/^@/, '');
  const followed = readJson(FOLLOWED_FILE);
  return followed.some(item => item.username.toLowerCase() === cleanUser);
}

/**
 * Registra que um perfil foi seguido
 */
function recordFollow(username, extra = {}) {
  const cleanUser = username.toLowerCase().replace(/^@/, '');
  const followed = readJson(FOLLOWED_FILE);
  
  const existingIndex = followed.findIndex(item => item.username.toLowerCase() === cleanUser);
  const record = {
    username: cleanUser,
    followedAt: new Date().toISOString(),
    status: 'following',
    ...extra
  };

  if (existingIndex >= 0) {
    followed[existingIndex] = record;
  } else {
    followed.push(record);
  }

  writeJson(FOLLOWED_FILE, followed);
}

/**
 * Registra que um perfil foi deixado de seguir
 */
function recordUnfollow(username) {
  const cleanUser = username.toLowerCase().replace(/^@/, '');
  
  // Atualiza em followed.json
  const followed = readJson(FOLLOWED_FILE);
  const existing = followed.find(item => item.username.toLowerCase() === cleanUser);
  if (existing) {
    existing.status = 'unfollowed';
    existing.unfollowedAt = new Date().toISOString();
    writeJson(FOLLOWED_FILE, followed);
  }

  // Adiciona ao histórico de unfollowed.json
  const unfollowed = readJson(UNFOLLOWED_FILE);
  unfollowed.push({
    username: cleanUser,
    unfollowedAt: new Date().toISOString()
  });
  writeJson(UNFOLLOWED_FILE, unfollowed);
}

/**
 * Retorna lista de contas que foram seguidas há mais de `daysAgo` dias e ainda não receberam unfollow
 */
function getAccountsToUnfollow(daysAgo = 3, limit = 30) {
  const followed = readJson(FOLLOWED_FILE);
  const cutoffTime = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);

  const candidates = followed.filter(item => {
    if (item.status === 'unfollowed') return false;
    const followTime = new Date(item.followedAt).getTime();
    return followTime <= cutoffTime;
  });

  return candidates.slice(0, limit);
}

/**
 * Retorna resumo das estatísticas locais
 */
function getStats() {
  const followed = readJson(FOLLOWED_FILE);
  const unfollowed = readJson(UNFOLLOWED_FILE);
  const active = followed.filter(item => item.status !== 'unfollowed').length;

  return {
    totalFollowed: followed.length,
    activeFollowing: active,
    totalUnfollowed: unfollowed.length
  };
}

module.exports = {
  hasFollowed,
  recordFollow,
  recordUnfollow,
  getAccountsToUnfollow,
  getStats
};
