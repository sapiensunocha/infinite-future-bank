const { contextBridge } = require('electron');

// Expose safe platform info to the renderer
contextBridge.exposeInMainWorld('__DEUS_PLATFORM__', {
  isDesktop: true,
  platform: process.platform, // 'darwin' | 'win32' | 'linux'
  version: process.env.npm_package_version || '1.4.0',
});
