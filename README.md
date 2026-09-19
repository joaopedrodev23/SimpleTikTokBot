# SimpleTikTokBot 🤖🎵

> **Robô Open Source de Automação, Crescimento e Acessibilidade para o TikTok**  
> Desenvolvido com foco em segurança, facilidade de uso para leigos e privacidade total.

---

## 🌟 Recursos Principais

- **🚀 Modo Crescimento Inteligente**:
  - Segue automaticamente seguidores de perfis de referência (concorrentes ou contas do seu mesmo nicho).
  - Coleta contas reais e ativas navegando pelos seguidores do perfil alvo.
- **❤️ Interação Assistida (Curtir Vídeos)**:
  - Opcionalmente curte o vídeo mais recente do perfil seguido para gerar engajamento e aumentar a taxa de *follow-back*.
- **🧹 Modo Limpeza (Unfollow Seguro)**:
  - Deixa de seguir automaticamente contas que foram seguidas pelo robô há mais de X dias (configurável).
- **🛡️ Proteção Anti-Bloqueio (Stealth & Human Delay)**:
  - Utiliza `puppeteer-extra-plugin-stealth` para mascarar automação de navegadores.
  - Intervalos aleatórios configuráveis (ex: 25 a 55 segundos) imitando o comportamento humano real.
  - Detecção inteligente de desafios de segurança (CAPTCHA) com alerta sonoro e pausa automática aguardando resolução.
- **♿ Foco em Acessibilidade**:
  - Interface no terminal em alto contraste.
  - Avisos sonoros para notificações importantes e quebra-cabeças.
  - Navegação simples por menus numéricos de 1 tecla.
- **🔒 100% Seguro & Privado**:
  - Seus dados, senhas e cookies **nunca** saem do seu computador.
  - Zero telemetria, zero servidores intermediários.

---

## 🚀 Como Usar (Passo a Passo Rápido)

### 1. Pré-requisito
Você só precisa ter o **Node.js** instalado na sua máquina (caso ainda não tenha, baixe a versão LTS gratuita em [nodejs.org](https://nodejs.org/)).

### 2. Executando o Robô
1. Dê **dois cliques** no arquivo:
   ```text
   abrir-simpletiktokbot.cmd
   ```
2. Na primeira vez, o script irá configurar automaticamente as dependências necessárias.
3. Escolha a opção desejada no menu interativo:
   - **`[1]`** Iniciar Crescimento (Seguir seguidores)
   - **`[2]`** Iniciar Limpeza (Deixar de seguir contas antigas)
   - **`[3]`** Testar Conexão e Fazer Login
   - **`[4]`** Ver Configurações
   - **`[0]`** Sair

---

## 🎯 Configurando Seus Perfis Alvos

Abra o arquivo `targets.txt` com qualquer editor de texto (Bloco de Notas) e adicione os perfis do seu nicho (um por linha), por exemplo:

```text
@cortesrapidos
@manualdomundo
@flowpdc
```

---

## ⚙️ Configurações Avançadas (`config.json`)

Você pode personalizar o comportamento do robô editando o arquivo `config.json`:

```json
{
  "headless": false,
  "minDelaySeconds": 25,
  "maxDelaySeconds": 55,
  "maxFollowsPerRun": 30,
  "likeRecentVideos": true,
  "unfollowAfterDays": 3,
  "unfollowLimitPerRun": 30,
  "audioNotifications": true,
  "highContrast": true
}
```

| Campo | Padrão | Descrição |
| :--- | :--- | :--- |
| `headless` | `false` | `false` exibe a janela do navegador; `true` roda em segundo plano. |
| `minDelaySeconds` | `25` | Tempo mínimo de espera entre cada ação (em segundos). |
| `maxDelaySeconds` | `55` | Tempo máximo de espera entre cada ação (em segundos). |
| `maxFollowsPerRun` | `30` | Limite de contas a seguir por sessão para preservar sua conta. |
| `likeRecentVideos` | `true` | Se deve curtir o vídeo recente da pessoa seguida. |
| `unfollowAfterDays`| `3` | Quantos dias esperar após seguir antes de deixar de seguir no modo limpeza. |
| `audioNotifications`| `true` | Ativa alertas sonoros de acessibilidade para CAPTCHAs e conclusões. |

---

## 🔑 Dica: Importação Direta de Sessão (`importar-sessao-tiktok.cmd`)

Se você encontrar desafios ou CAPTCHAs complexos no navegador automatizado, basta dar dois cliques em:
```text
importar-sessao-tiktok.cmd
```
E colar o seu `sessionid` copiado dos cookies do seu navegador normal (Chrome ou Edge). O bot salva a sessão e já inicializa autenticado!

---

## 📁 Estrutura do Projeto

```text
SimpleTikTokBot/
├── abrir-simpletiktokbot.cmd      # Inicializador seguro para Windows (2 cliques)
├── abrir-simpletiktokbot.ps1      # Launcher inteligente com verificação de ambiente
├── importar-sessao-tiktok.cmd     # Utilitário para importação de cookie/sessionid
├── importar-sessao-tiktok.ps1     # Script de importação
├── config.json                    # Arquivo de configuração de limites e delays
├── targets.txt                    # Lista de perfis alvos
├── package.json                   # Dependências do projeto (Node.js)
├── LICENSE                        # Licença MIT
├── README.md                      # Documentação completa
└── src/
    ├── index.js                   # Menu interativo principal do terminal
    ├── browser.js                 # Inicializador com Puppeteer Stealth e detecção de Chrome/Edge
    ├── session.js                 # Gerenciamento de cookies e detecção de login
    ├── bot.js                     # Motor central de ações (seguir, curtir, unfollow, captcha)
    ├── db.js                      # Banco de dados local JSON (histórico seguro)
    ├── selectors.js               # Seletores multilíngues e resilientes
    └── utils.js                   # Utilitários de log, atrasos humanos e acessibilidade
```

---

## 📜 Licença

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para obter mais informações.
