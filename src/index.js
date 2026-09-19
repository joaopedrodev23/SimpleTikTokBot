const readline = require('readline');
const { initBrowser } = require('./browser');
const { ensureLogin, isLoggedIn } = require('./session');
const { runFollowTargets, runUnfollowRoutine } = require('./bot');
const db = require('./db');
const { colors, log, loadConfig, loadTargets, playChime } = require('./utils');

function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function askQuestion(query) {
  const rl = createPrompt();
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function displayBanner() {
  console.clear();
  const c = colors;
  console.log(`${c.cyan}${c.bold}`);
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                        SimpleTikTokBot v1.0                          ║');
  console.log('║       Automação e Crescimento Seguro & Acessível no TikTok           ║');
  console.log('║                   Open Source por João Pedro                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`${c.reset}`);

  const stats = db.getStats();
  console.log(`${c.bold}📊 Status do Banco Local:${c.reset}`);
  console.log(`   • Contas já seguidas pelo robô : ${c.green}${stats.totalFollowed}${c.reset}`);
  console.log(`   • Contas atualmente ativas     : ${c.cyan}${stats.activeFollowing}${c.reset}`);
  console.log(`   • Contas deixadas de seguir    : ${c.yellow}${stats.totalUnfollowed}${c.reset}`);
  console.log('');
}

async function showMainMenu() {
  while (true) {
    displayBanner();
    const c = colors;

    console.log(`${c.bold}📋 ESCOLHA UMA OPÇÃO:${c.reset}`);
    console.log(`  ${c.green}[1]${c.reset} Iniciar Crescimento (Seguir seguidores de perfis alvo)`);
    console.log(`  ${c.yellow}[2]${c.reset} Iniciar Limpeza (Deixar de seguir contas antigas / Unfollow)`);
    console.log(`  ${c.cyan}[3]${c.reset} Testar Conexão / Fazer Login no TikTok`);
    console.log(`  ${c.magenta}[4]${c.reset} Ver Configurações Atuais`);
    console.log(`  ${c.red}[0]${c.reset} Sair`);
    console.log('');

    const choice = await askQuestion('Digite o número da opção desejada e pressione Enter: ');

    if (choice === '1') {
      await handleFollowFlow();
    } else if (choice === '2') {
      await handleUnfollowFlow();
    } else if (choice === '3') {
      await handleLoginCheck();
    } else if (choice === '4') {
      await handleShowConfig();
    } else if (choice === '0') {
      console.log('\nAté logo! O SimpleTikTokBot foi encerrado com sucesso.\n');
      process.exit(0);
    } else {
      console.log(`\n${c.red}Opção inválida! Pressione Enter para continuar...${c.reset}`);
      await askQuestion('');
    }
  }
}

async function handleFollowFlow() {
  const config = loadConfig();
  let targets = loadTargets();

  displayBanner();
  log.header('MODO CRESCIMENTO (SEGUIR SEGUIDORES)');

  if (targets.length === 0) {
    console.log('Nenhum perfil alvo foi encontrado no arquivo targets.txt.');
    const inputTarget = await askQuestion('Digite o @usuario alvo (ex: cortesrapidos): ');
    if (inputTarget) {
      targets = [inputTarget.replace(/^@/, '')];
    } else {
      log.warn('Nenhum alvo informado. Retornando ao menu.');
      await askQuestion('\nPressione Enter para voltar ao menu...');
      return;
    }
  } else {
    console.log(`Alvos carregados de targets.txt: ${targets.map(t => '@' + t).join(', ')}`);
  }

  console.log(`\nConfigurações para esta sessão:`);
  console.log(` • Limite máximo de contas : ${config.maxFollowsPerRun}`);
  console.log(` • Curtir vídeo recente    : ${config.likeRecentVideos ? 'Sim' : 'Não'}`);
  console.log(` • Intervalo anti-bloqueio : ${config.minDelaySeconds}s a ${config.maxDelaySeconds}s`);
  console.log('');

  const confirm = await askQuestion('Deseja iniciar agora? (S/N): ');
  if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'sim' && confirm !== '') {
    return;
  }

  log.info('Iniciando navegador com proteção Stealth...');
  const { browser, page } = await initBrowser(config);

  try {
    const logged = await ensureLogin(page);
    if (!logged) {
      log.error('Não foi possível autenticar no TikTok.');
      await askQuestion('\nPressione Enter para voltar...');
      await browser.close();
      return;
    }

    await runFollowTargets(page, targets, config);
  } catch (err) {
    log.error(`Erro durante execução: ${err.message}`);
  } finally {
    console.log('\nSessão finalizada. Fechando navegador...');
    await browser.close().catch(() => {});
    await askQuestion('\nPressione Enter para voltar ao menu principal...');
  }
}

async function handleUnfollowFlow() {
  const config = loadConfig();
  displayBanner();
  log.header('MODO LIMPEZA (UNFOLLOW)');

  const stats = db.getStats();
  console.log(`Contas ativas seguidas pelo robô: ${stats.activeFollowing}`);
  console.log(`Critério: Deixar de seguir contas com mais de ${config.unfollowAfterDays} dias.`);
  console.log(`Limite para esta rodada: até ${config.unfollowLimitPerRun} contas.\n`);

  const confirm = await askQuestion('Deseja iniciar a limpeza? (S/N): ');
  if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'sim' && confirm !== '') {
    return;
  }

  log.info('Iniciando navegador...');
  const { browser, page } = await initBrowser(config);

  try {
    const logged = await ensureLogin(page);
    if (!logged) {
      log.error('Não foi possível autenticar no TikTok.');
      await askQuestion('\nPressione Enter para voltar...');
      await browser.close();
      return;
    }

    await runUnfollowRoutine(page, config);
  } catch (err) {
    log.error(`Erro durante limpeza: ${err.message}`);
  } finally {
    console.log('\nLimpeza concluída. Fechando navegador...');
    await browser.close().catch(() => {});
    await askQuestion('\nPressione Enter para voltar ao menu principal...');
  }
}

async function handleLoginCheck() {
  const config = loadConfig();
  displayBanner();
  log.header('TESTE DE CONEXÃO E LOGIN');

  log.info('Abrindo navegador...');
  const { browser, page } = await initBrowser({ ...config, headless: false });

  try {
    const logged = await ensureLogin(page);
    if (logged) {
      log.success('Sessão validada e cookies atualizados!');
      playChime('done');
    }
  } catch (err) {
    log.error(`Erro: ${err.message}`);
  } finally {
    await askQuestion('\nPressione Enter para fechar o navegador e voltar...');
    await browser.close().catch(() => {});
  }
}

async function handleShowConfig() {
  displayBanner();
  log.header('CONFIGURAÇÕES DO BOT (config.json)');
  const config = loadConfig();
  console.log(JSON.stringify(config, null, 2));
  console.log('\nVocê pode alterar esses valores diretamente no arquivo config.json.');
  await askQuestion('\nPressione Enter para voltar ao menu principal...');
}

// Inicia aplicação
showMainMenu().catch(err => {
  log.error(`Falha crítica: ${err.message}`);
});
