/**
 * electron-builder configuration
 * Builds DEUS as a native desktop app for macOS (DMG) and Windows (NSIS installer)
 */
module.exports = {
  appId: 'org.infinitefuturebank.deus',
  productName: 'DEUS',
  copyright: 'Copyright © 2026 Infinite Future Bank',

  // Output directory for installers (separate from Vite's dist/)
  directories: { output: 'release' },

  // What to include in the app bundle
  files: [
    'dist/**/*',
    'electron/**/*',
    'public/icons/**/*',
    'package.json',
  ],

  // ── macOS ──────────────────────────────────────────────────────────────────
  mac: {
    category: 'public.app-category.finance',
    icon: 'public/icons/icon-512.png',
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] },
      { target: 'zip', arch: ['x64', 'arm64'] },
    ],
    identity: null,              // skip code signing — users right-click → Open on first launch
    gatekeeperAssess: false,
  },

  dmg: {
    title: 'DEUS — Infinite Future Bank',
    background: null,
    window: { width: 540, height: 380 },
    contents: [
      { x: 130, y: 220, type: 'file' },
      { x: 410, y: 220, type: 'link', path: '/Applications' },
    ],
    artifactName: 'DEUS-${version}-mac-${arch}.dmg',
  },

  // ── Windows ────────────────────────────────────────────────────────────────
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },           // Standard installer
      { target: 'portable', arch: ['x64'] },        // No-install portable exe
    ],
    icon: 'public/icons/icon-512.png',
    artifactName: 'DEUS-${version}-win-${arch}.${ext}',
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    installerIcon: 'public/icons/icon-512.png',
    uninstallerIcon: 'public/icons/icon-512.png',
    installerHeaderIcon: 'public/icons/icon-512.png',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'DEUS — IFB',
  },

  // ── Linux (bonus) ──────────────────────────────────────────────────────────
  linux: {
    target: ['AppImage', 'deb'],
    category: 'Finance',
    icon: 'public/icons/icon-512.png',
    artifactName: 'DEUS-${version}-linux-${arch}.${ext}',
  },

  // ── Publish (GitHub Releases) ──────────────────────────────────────────────
  publish: {
    provider: 'github',
    owner: 'sapiensunocha',
    repo: 'deus-releases',
    releaseType: 'release',
  },
};
