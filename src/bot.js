const selectors = require('./selectors');
const db = require('./db');
const { log, sleep, randomBetween, humanDelay, playChime } = require('./utils');

/**
 * Verifica e trata desafios de segurança (Captcha do TikTok)
 */
async function checkCaptcha(page) {
  try {
    let captchaFound = false;
    for (const sel of selectors.captcha) {
      const el = await page.$(sel);
      if (el) {
        captchaFound = true;
        break;
      }
    }

    if (captchaFound) {
      log.warn('⚠️ Desafio de segurança do TikTok detectado na tela!');
      console.log('  Por favor, resolva o quebra-cabeça / verificação no navegador.');
      console.log('  O robô aguardará você resolver para continuar automaticamente...\n');
      playChime('alert');

      // Aguarda até o container do captcha sumir (máximo 3 minutos)
      const timeoutMs = 180000;
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        await sleep(3000);
        let stillThere = false;
        for (const sel of selectors.captcha) {
          const el = await page.$(sel);
          if (el) {
            stillThere = true;
            break;
          }
        }
        if (!stillThere) {
          log.success('Desafio de segurança resolvido! Retomando automação...');
          playChime('done');
          await sleep(2000);
          return true;
        }
      }
      log.warn('Tempo limite para resolução do captcha excedido.');
      return false;
    }
    return true;
  } catch (err) {
    return true;
  }
}

/**
 * Coleta lista de seguidores a partir de um perfil de referência
 */
async function getFollowersFromTarget(page, targetUsername, countLimit = 30) {
  const cleanTarget = targetUsername.toLowerCase().replace(/^@/, '');
  log.info(`Acessando perfil de referência: @${cleanTarget}`);

  await page.goto(`https://www.tiktok.com/@${cleanTarget}`, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await sleep(3000);
  await checkCaptcha(page);

  // Clica no botão de seguidores para abrir o modal
  let openedModal = false;
  for (const sel of selectors.profile.followersButton) {
    try {
      const btn = await page.$(sel);
      if (btn) {
        await btn.click();
        openedModal = true;
        break;
      }
    } catch (e) {}
  }

  if (!openedModal) {
    log.warn(`Não foi possível abrir lista de seguidores de @${cleanTarget}. O perfil pode ser privado.`);
    return [];
  }

  await sleep(3000);
  await checkCaptcha(page);

  // Aguarda modal aparecer
  let modalFound = false;
  for (const sel of selectors.profile.followersModal) {
    const modal = await page.$(sel);
    if (modal) {
      modalFound = true;
      break;
    }
  }

  const collectedUsers = new Set();
  let scrollAttempts = 0;
  const maxScrollAttempts = 25;

  log.info('Buscando contas ativas na lista de seguidores...');

  while (collectedUsers.size < countLimit && scrollAttempts < maxScrollAttempts) {
    // Extrai links de usuários visíveis no modal
    const userLinks = await page.evaluate((modalSelectors) => {
      const found = [];
      const dialog = document.querySelector('div[role="dialog"]') || document.querySelector('div[data-e2e="user-followers-list"]');
      if (!dialog) return found;

      const links = dialog.querySelectorAll('a[href*="/@"]');
      for (const a of links) {
        const match = a.getAttribute('href').match(/@([a-zA-Z0-9._-]+)/);
        if (match && match[1]) {
          found.push(match[1].toLowerCase());
        }
      }
      return found;
    }, selectors.profile.followersModal);

    for (const u of userLinks) {
      if (u !== cleanTarget && !db.hasFollowed(u)) {
        collectedUsers.add(u);
      }
    }

    // Rola o modal para baixo de forma suave
    await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]') || document.querySelector('div[data-e2e="user-followers-list"]');
      if (dialog) {
        const scrollable = dialog.querySelector('div[class*="UserListContainer"]') || dialog;
        scrollable.scrollTop += 500;
      } else {
        window.scrollBy(0, 500);
      }
    });

    await sleep(randomBetween(1500, 2500));
    scrollAttempts++;
  }

  log.info(`Total de novas contas encontradas para seguir: ${collectedUsers.size}`);

  // Tenta fechar o modal
  for (const sel of selectors.buttons.closeModal) {
    try {
      const closeBtn = await page.$(sel);
      if (closeBtn) {
        await closeBtn.click();
        break;
      }
    } catch (e) {}
  }

  return Array.from(collectedUsers).slice(0, countLimit);
}

/**
 * Segue um usuário específico pelo perfil dele
 */
async function followUser(page, username, config) {
  const cleanUser = username.toLowerCase().replace(/^@/, '');
  log.info(`Acessando @${cleanUser}...`);

  await page.goto(`https://www.tiktok.com/@${cleanUser}`, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
  await sleep(randomBetween(2500, 4000));
  await checkCaptcha(page);

  // Procura o botão de seguir
  let buttonFound = null;
  let buttonText = '';

  for (const sel of selectors.buttons.follow) {
    const buttons = await page.$$(sel);
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.innerText.trim().toLowerCase(), btn);
      if (selectors.buttons.followTexts.some(t => text.includes(t))) {
        buttonFound = btn;
        buttonText = text;
        break;
      } else if (selectors.buttons.followingTexts.some(t => text.includes(t))) {
        log.info(`Você já segue @${cleanUser}. Registrando no histórico.`);
        db.recordFollow(cleanUser);
        return false;
      }
    }
    if (buttonFound) break;
  }

  if (!buttonFound) {
    log.warn(`Botão de seguir não encontrado em @${cleanUser} (pode ser conta privada ou indisponível).`);
    return false;
  }

  // Clica no botão de seguir com movimento suave
  await buttonFound.click();
  await sleep(2000);
  await checkCaptcha(page);

  // Registra no banco de dados local
  db.recordFollow(cleanUser);
  log.follow(`✅ Seguiu com sucesso: @${cleanUser}`);

  // Opcional: Curte o 1º vídeo do perfil para chamar atenção (aumenta o follow-back)
  if (config.likeRecentVideos) {
    await sleep(randomBetween(1500, 2500));
    await likeRecentVideo(page, cleanUser);
  }

  return true;
}

/**
 * Curte o vídeo mais recente do perfil atual
 */
async function likeRecentVideo(page, username) {
  try {
    let videoEl = null;
    for (const sel of selectors.profile.videos) {
      videoEl = await page.$(sel);
      if (videoEl) break;
    }

    if (!videoEl) return false;

    await videoEl.click();
    await sleep(randomBetween(2500, 3500));
    await checkCaptcha(page);

    // Clica no botão de curtir se ainda não estiver curtido
    for (const sel of selectors.buttons.like) {
      const likeBtn = await page.$(sel);
      if (likeBtn) {
        await likeBtn.click();
        log.like(`❤️ Curtiu o vídeo mais recente de @${username}`);
        await sleep(1500);
        break;
      }
    }

    // Pressiona Escape para fechar o modal de visualização de vídeo
    await page.keyboard.press('Escape');
    await sleep(1500);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Deixa de seguir um usuário (Unfollow)
 */
async function unfollowUser(page, username) {
  const cleanUser = username.toLowerCase().replace(/^@/, '');
  log.info(`Acessando @${cleanUser} para deixar de seguir...`);

  await page.goto(`https://www.tiktok.com/@${cleanUser}`, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
  await sleep(randomBetween(2500, 4000));
  await checkCaptcha(page);

  let followingBtn = null;
  for (const sel of selectors.buttons.follow) {
    const buttons = await page.$$(sel);
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.innerText.trim().toLowerCase(), btn);
      if (selectors.buttons.followingTexts.some(t => text.includes(t))) {
        followingBtn = btn;
        break;
      }
    }
    if (followingBtn) break;
  }

  if (!followingBtn) {
    log.info(`Você já não seguia mais @${cleanUser}.`);
    db.recordUnfollow(cleanUser);
    return true;
  }

  await followingBtn.click();
  await sleep(2000);

  // Se houver modal de confirmação no TikTok, confirma
  try {
    const confirmBtn = await page.$('button[data-e2e="unfollow-confirm-button"], div[role="dialog"] button:not([aria-label*="Fechar"])');
    if (confirmBtn) {
      await confirmBtn.click();
      await sleep(1500);
    }
  } catch (e) {}

  db.recordUnfollow(cleanUser);
  log.unfollow(`🧹 Deixou de seguir: @${cleanUser}`);
  return true;
}

/**
 * Rotina Completa: Seguir seguidores de perfis alvo
 */
async function runFollowTargets(page, targets, config) {
  log.header('INICIANDO ROTINA DE SEGUIR SEGUIDORES DE ALVOS');
  
  if (!targets || targets.length === 0) {
    log.warn('Nenhum perfil alvo informado. Adicione perfis em targets.txt ou digite um alvo.');
    return;
  }

  let totalFollowedInSession = 0;
  const maxFollows = config.maxFollowsPerRun || 30;

  for (const target of targets) {
    if (totalFollowedInSession >= maxFollows) {
      log.success(`Limite seguro de ${maxFollows} contas atingido para esta sessão!`);
      break;
    }

    const needed = maxFollows - totalFollowedInSession;
    const candidates = await getFollowersFromTarget(page, target, needed + 10);

    for (const user of candidates) {
      if (totalFollowedInSession >= maxFollows) break;

      const followed = await followUser(page, user, config);
      if (followed) {
        totalFollowedInSession++;
        log.info(`Progresso: ${totalFollowedInSession}/${maxFollows} contas seguidas.`);
        await humanDelay(config.minDelaySeconds, config.maxDelaySeconds, 'Aguardando intervalo seguro anti-bloqueio');
      } else {
        await sleep(randomBetween(3000, 6000));
      }
    }
  }

  log.header(`SESSÃO CONCLUÍDA: ${totalFollowedInSession} CONTAS SEGUIDAS`);
  playChime('done');
}

/**
 * Rotina Completa: Unfollow de contas antigas
 */
async function runUnfollowRoutine(page, config) {
  log.header('INICIANDO ROTINA DE LIMPEZA (DEIXAR DE SEGUIR)');

  const days = config.unfollowAfterDays || 3;
  const limit = config.unfollowLimitPerRun || 30;
  const toUnfollow = db.getAccountsToUnfollow(days, limit);

  if (toUnfollow.length === 0) {
    log.info(`Nenhuma conta seguida há mais de ${days} dias pendente de unfollow no banco.`);
    return;
  }

  log.info(`Encontradas ${toUnfollow.length} contas para deixar de seguir.`);
  let count = 0;

  for (const item of toUnfollow) {
    await unfollowUser(page, item.username);
    count++;
    log.info(`Progresso de Unfollow: ${count}/${toUnfollow.length}`);
    await humanDelay(config.minDelaySeconds, config.maxDelaySeconds, 'Aguardando intervalo de limpeza');
  }

  log.header(`LIMPEZA CONCLUÍDA: ${count} CONTAS REMOVIDAS`);
  playChime('done');
}

module.exports = {
  checkCaptcha,
  getFollowersFromTarget,
  followUser,
  likeRecentVideo,
  unfollowUser,
  runFollowTargets,
  runUnfollowRoutine
};
