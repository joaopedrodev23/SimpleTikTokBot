/**
 * Seletores resilientes e multilíngues para o TikTok Web
 */

module.exports = {
  // Verificação de Login
  login: {
    avatarIcon: [
      'a[data-e2e="profile-icon"]',
      'img[data-e2e="user-avatar"]',
      'div[data-e2e="upload-icon"]',
      'header a[href*="/@"]'
    ],
    loginButton: [
      'button[data-e2e="top-login-button"]',
      'button[data-e2e="nav-login-button"]',
      'button:has-text("Entrar")',
      'button:has-text("Log in")'
    ]
  },

  // Seletores da página de perfil do TikTok (@usuario)
  profile: {
    followersButton: [
      'strong[data-e2e="followers-count"]',
      'span[data-e2e="followers-count"]',
      'a[href*="/followers"]',
      'div[data-e2e="followers"]'
    ],
    followersModal: [
      'div[data-e2e="user-followers-list"]',
      'div[role="dialog"]',
      'div[class*="DivUserListContainer"]'
    ],
    userLinksInModal: [
      'a[data-e2e="user-card-avatar"]',
      'a[data-e2e="search-card-user-link"]',
      'div[role="dialog"] a[href*="/@"]',
      'div[data-e2e="user-followers-list"] a[href*="/@"]'
    ],
    videos: [
      'div[data-e2e="user-post-item"] a',
      'div[data-e2e="user-post-item-desc"] a',
      'a[href*="/video/"]'
    ]
  },

  // Botões de Ação (Seguir / Deixar de Seguir)
  buttons: {
    follow: [
      'button[data-e2e="follow-button"]',
      'button[data-e2e="user-follow-button"]'
    ],
    // Textos que confirmam que o botão é de "Seguir" (e não "Seguindo")
    followTexts: [
      'seguir',
      'follow',
      'seguir de volta',
      'follow back'
    ],
    // Textos que confirmam que já está seguindo
    followingTexts: [
      'seguindo',
      'following',
      'amigos',
      'friends',
      'solicitado',
      'requested'
    ],
    like: [
      'span[data-e2e="like-icon"]',
      'button[data-e2e="like-icon"]',
      'div[data-e2e="like-icon"]',
      'button[aria-label*="Like"]',
      'button[aria-label*="Curtir"]'
    ],
    closeModal: [
      'button[data-e2e="modal-close-icon"]',
      'div[role="dialog"] button[aria-label*="Fechar"]',
      'div[role="dialog"] button[aria-label*="Close"]',
      'svg[data-e2e="modal-close-icon"]'
    ]
  },

  // Detecção de Desafio de Segurança / Captcha
  captcha: [
    '#captcha_container',
    'div[class*="captcha_verify_container"]',
    'div[class*="secsdk-captcha"]',
    '.captcha-verify-container',
    'div[class*="verify-wrap"]'
  ]
};
