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
 * Abre o modal de seguidores de um perfil no TikTok
 */
async function openFollowersModal(page, targetUsername) {
  const cleanTarget = targetUsername.toLowerCase().replace(/^@/, '');
  log.info(`Acessando perfil de referência: @${cleanTarget}`);

  await page.goto(`https://www.tiktok.com/@${cleanTarget}`, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await sleep(3000);
  await checkCaptcha(page);

  // Tenta abrir o modal com clique resiliente em JavaScript
  const clicked = await page.evaluate(() => {
    const el = document.querySelector('strong[data-e2e="followers-count"]') ||
               document.querySelector('button[data-e2e="followers"]') ||
               document.querySelector('span[data-e2e="followers"]');
    if (el) {
      if (el.parentElement) el.parentElement.click();
      el.click();
      return true;
    }
    return false;
  });

  if (!clicked) {
    log.warn(`Elemento de seguidores não encontrado para @${cleanTarget}.`);
    return false;
  }

  // Aguarda o modal aparecer
  try {
    await page.waitForSelector('div[data-e2e="follow-info-popup"], div[role="dialog"]', { timeout: 10000 });
    log.success(`Lista de seguidores de @${cleanTarget} aberta com sucesso!`);
    await sleep(2000);
    return true;
  } catch (err) {
    log.warn(`Não foi possível abrir o diálogo de seguidores de @${cleanTarget}. O perfil pode ser privado ou ter restrição.`);
    return false;
  }
}

/**
 * Segue um usuário diretamente pela lista do modal
 */
async function followUserInModal(page, username) {
  const cleanUser = username.toLowerCase().replace(/^@/, '');

  const result = await page.evaluate((targetUser, followTexts, followingTexts) => {
    const popup = document.querySelector('div[data-e2e="follow-info-popup"]') || document.querySelector('div[role="dialog"]');
    if (!popup) return { success: false, reason: 'modal_not_found' };

    const container = popup.querySelector('div[class*="DivUserListContainer"]') || popup;
    const links = Array.from(container.querySelectorAll('a[href*="/@"]'));

    for (const a of links) {
      const match = a.getAttribute('href').match(/@([a-zA-Z0-9._-]+)/);
      if (match && match[1] && match[1].toLowerCase() === targetUser.toLowerCase()) {
        let row = a.closest('div[class*="DivUserItem"]') || a.parentElement;
        while (row && !row.querySelector('button') && row !== container) {
          row = row.parentElement;
        }
        const btn = row ? row.querySelector('button') : null;
        if (!btn) return { success: false, reason: 'button_not_found' };

        const text = btn.innerText.trim().toLowerCase();
        if (followingTexts.some(t => text.includes(t))) {
          return { success: false, alreadyFollowing: true };
        }

        // Rola a linha para visualização suave
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        btn.click();
        return { success: true };
      }
    }

    return { success: false, reason: 'user_not_found' };
  }, cleanUser, selectors.buttons.followTexts, selectors.buttons.followingTexts);

  if (result.alreadyFollowing) {
    log.info(`Você já segue @${cleanUser}. Registrando no histórico.`);
    db.recordFollow(cleanUser);
    return false;
  }

  if (result.success) {
    await sleep(2000);
    db.recordFollow(cleanUser);
    log.follow(`✅ Seguiu com sucesso: @${cleanUser}`);
    return true;
  }

  return false;
}

/**
 * Curte o vídeo mais recente de um usuário em uma aba secundária
 */
async function likeRecentVideoInTab(browser, username) {
  let userTab = null;
  try {
    userTab = await browser.newPage();
    await userTab.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
    await userTab.goto(`https://www.tiktok.com/@${username}`, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
    await sleep(randomBetween(2500, 3500));

    let videoEl = null;
    for (const sel of selectors.profile.videos) {
      videoEl = await userTab.$(sel);
      if (videoEl) break;
    }

    if (videoEl) {
      await videoEl.click();
      await sleep(randomBetween(2000, 3000));

      for (const sel of selectors.buttons.like) {
        const likeBtn = await userTab.$(sel);
        if (likeBtn) {
          await likeBtn.click();
          log.like(`❤️ Curtiu o vídeo mais recente de @${username}`);
          await sleep(1500);
          break;
        }
      }
    }
  } catch (err) {
    // Silencioso se perfil não tiver vídeos públicos
  } finally {
    if (userTab) {
      await userTab.close().catch(() => {});
    }
  }
}

/**
 * Segue usuário acessando o perfil diretamente (fallback caso modal não esteja disponível)
 */
async function followUserDirect(page, username, config) {
  const cleanUser = username.toLowerCase().replace(/^@/, '');
  log.info(`Acessando @${cleanUser}...`);

  await page.goto(`https://www.tiktok.com/@${cleanUser}`, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
  await sleep(randomBetween(2500, 4000));
  await checkCaptcha(page);

  let buttonFound = null;
  for (const sel of selectors.buttons.follow) {
    const buttons = await page.$$(sel);
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.innerText.trim().toLowerCase(), btn);
      if (selectors.buttons.followTexts.some(t => text.includes(t))) {
        buttonFound = btn;
        break;
      } else if (selectors.buttons.followingTexts.some(t => text.includes(t))) {
        log.info(`Você já segue @${cleanUser}.`);
        db.recordFollow(cleanUser);
        return false;
      }
    }
    if (buttonFound) break;
  }

  if (!buttonFound) {
    log.warn(`Botão de seguir não encontrado em @${cleanUser}.`);
    return false;
  }

  await buttonFound.click();
  await sleep(2000);
  db.recordFollow(cleanUser);
  log.follow(`✅ Seguiu com sucesso: @${cleanUser}`);
  return true;
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
 * Rotina Completa: Seguir seguidores de perfis alvos
 */
async function runFollowTargets(page, targets, config, browser) {
  log.header('INICIANDO ROTINA DE SEGUIR SEGUIDORES DE ALVOS');

  if (!targets || targets.length === 0) {
    log.warn('Nenhum perfil alvo informado.');
    return;
  }

  let totalFollowedInSession = 0;
  const maxFollows = config.maxFollowsPerRun || 30;

  for (const target of targets) {
    if (totalFollowedInSession >= maxFollows) {
      log.success(`Limite seguro de ${maxFollows} contas atingido para esta sessão!`);
      break;
    }

    const cleanTarget = target.toLowerCase().replace(/^@/, '');
    const modalOpened = await openFollowersModal(page, cleanTarget);

    if (!modalOpened) {
      log.warn(`Tentando seguir o perfil @${cleanTarget} diretamente...`);
      const followedDirect = await followUserDirect(page, cleanTarget, config);
      if (followedDirect) totalFollowedInSession++;
      continue;
    }

    log.info('Buscando contas ativas na lista de seguidores...');
    let scrollAttempts = 0;
    const maxScrolls = 40;

    while (totalFollowedInSession < maxFollows && scrollAttempts < maxScrolls) {
      // Coleta usuários visíveis atualmente na lista do modal
      const visibleUsers = await page.evaluate(() => {
        const popup = document.querySelector('div[data-e2e="follow-info-popup"]') || document.querySelector('div[role="dialog"]');
        if (!popup) return [];

        const container = popup.querySelector('div[class*="DivUserListContainer"]') || popup;
        const links = Array.from(container.querySelectorAll('a[href*="/@"]'));
        const users = [];
        const seen = new Set();

        for (const a of links) {
          const match = a.getAttribute('href').match(/@([a-zA-Z0-9._-]+)/);
          if (match && match[1]) {
            const u = match[1].toLowerCase();
            if (!seen.has(u)) {
              seen.add(u);
              users.push(u);
            }
          }
        }
        return users;
      });

      // Filtra candidatos que ainda não foram seguidos pelo robô
      const candidates = visibleUsers.filter(u => u !== cleanTarget && !db.hasFollowed(u));

      if (candidates.length === 0) {
        // Rola a lista para carregar mais usuários
        await page.evaluate(() => {
          const popup = document.querySelector('div[data-e2e="follow-info-popup"]') || document.querySelector('div[role="dialog"]');
          if (popup) {
            const container = popup.querySelector('div[class*="DivUserListContainer"]') || popup;
            container.scrollTop += 600;
          }
        });
        await sleep(randomBetween(1500, 2500));
        scrollAttempts++;
        continue;
      }

      // Segue os candidatos encontrados
      for (const candidate of candidates) {
        if (totalFollowedInSession >= maxFollows) break;

        const followed = await followUserInModal(page, candidate);
        if (followed) {
          totalFollowedInSession++;
          log.info(`Progresso: ${totalFollowedInSession}/${maxFollows} contas seguidas.`);

          // Opcional: Curte o vídeo mais recente em aba separada
          if (config.likeRecentVideos && browser) {
            await likeRecentVideoInTab(browser, candidate);
          }

          await humanDelay(config.minDelaySeconds, config.maxDelaySeconds, 'Aguardando intervalo seguro anti-bloqueio');
        } else {
          await sleep(1500);
        }
      }

      // Rola a lista para continuar carregando novos perfis
      await page.evaluate(() => {
        const popup = document.querySelector('div[data-e2e="follow-info-popup"]') || document.querySelector('div[role="dialog"]');
        if (popup) {
          const container = popup.querySelector('div[class*="DivUserListContainer"]') || popup;
          container.scrollTop += 600;
        }
      });
      await sleep(2000);
      scrollAttempts++;
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
  openFollowersModal,
  followUserInModal,
  followUserDirect,
  likeRecentVideoInTab,
  unfollowUser,
  runFollowTargets,
  runUnfollowRoutine
};
