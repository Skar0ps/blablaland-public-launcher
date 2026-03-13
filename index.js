const { app, BrowserWindow, Menu, shell, MenuItem, dialog } = require('electron');
const path = require('path');

/** URL du site Blablaland */
const BLABLALAND_URL = 'http://blablaland-site.test';

/** Origin du site Blablaland
 * 
 * Utilisé pour la Content Security Policy et la validation de navigation.
 */
const BLABLALAND_SITE_ORIGIN = new URL(BLABLALAND_URL).origin;

/** Indique si l'application est en mode développement.
 * 
 * Par défaut, false si l'application est packagée (exportée).
*/
const isDev = !app.isPackaged;

/** Vérifie si une instance de l'application est déjà en cours d'exécution.
 * 
 * Si une instance existe déjà, on quitte la nouvelle instance pour éviter les conflits.
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  const createMenu = () => {
    // menu minimal pour activer les raccourcis clavier (Ctrl+R, F5, Ctrl+Shift+R)
    const menuTemplate = [
      {
        label: 'Application',
        submenu: [
          { label: 'Recharger', role: 'reload' },
          {
            label: 'Recharger (F5)',
            accelerator: 'F5',
            click: (_, focusedWindow) => {
              if (focusedWindow) focusedWindow.webContents.reload();
            }
          },
          { label: 'Forcer le rechargement', role: 'forceReload' }
        ]
      }
    ];

    if (isDev) {
      menuTemplate[0].submenu.push({ type: 'separator' });
      menuTemplate[0].submenu.push({ label: 'Ouvrir les DevTools', role: 'toggleDevTools' });
    }

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  };

  const createWindow = () => {
    const mainWindow = new BrowserWindow({
      width: 1040,
      height: 730,
      center: true,
      icon: path.join(__dirname, 'assets/icon.ico'),
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        plugins: true,
        devTools: isDev,
        nodeIntegration: false,
        enableRemoteModule: false,
        safeDialogs: true
      },
    });

    // Show the main window when it's ready
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

    // Display context menu
    mainWindow.webContents.on('context-menu', (_event, params) => {
      const contextMenu = Menu.buildFromTemplate([
        { role: 'reload', label: "Recharger la page"},
        { role: 'forceReload', label: "Forcer le rechargement"},
        { type: 'separator' },
        { role: 'resetZoom', label: "Réinitialiser zoom"},
        { role: 'zoomIn', label: "Zoomer"},
        { role: 'zoomOut', label: "Dézoomer"},
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran'},
      ]);
      if (isDev) {
        contextMenu.append(new MenuItem({ type: 'separator' }));
        contextMenu.append(new MenuItem({
          label: 'Devtools',
          click: () => {
            mainWindow.webContents.inspectElement(params.x, params.y);
          }
        }));
      }
      
      contextMenu.popup(mainWindow, params.x, params.y);
    });


    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      if (isDev) {
        // en dev : pas de CSP injectée, on laisse passer les headers du serveur tels quels
        callback({ responseHeaders: details.responseHeaders });
        return;
      }

      // CSP stricte en production pour :
      // - limiter les sources de contenu aux domaines de confiance (ici, le site défini dans BLABLALAND_URL).
      // - autoriser l'exécution du plugin Flash via 'object-src'.
      // - éviter les attaques de type Cross-Site Scripting (XSS).
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            [
              `default-src 'self' ${BLABLALAND_SITE_ORIGIN} data: blob:`,
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${BLABLALAND_SITE_ORIGIN}`,
              `object-src 'self' ${BLABLALAND_SITE_ORIGIN}`,
              `style-src * 'unsafe-inline'`,
              `img-src * data: blob:`,
              `font-src * data:`,
              `connect-src * ws: wss:`,  // ws: explicite pour les WebSockets
              `media-src 'self' ${BLABLALAND_SITE_ORIGIN}`
            ].join('; ')
          ]
        }
      });
    });

    // bloquer les demandes de permissions car totalement inutiles (caméra, micro, notifications, etc.)
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(false);
    });

    const confirmAndOpenExternal = (url) => {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Annuler', 'Ouvrir'],
        defaultId: 1,
        cancelId: 0,
        title: 'Lien externe',
        message: 'Êtes-vous sûr d\'ouvrir cette page ?',
        detail: 'Elle sera ouverte dans votre navigateur par défaut car elle ne fait pas partie de Blablaland.'
      });
      if (choice === 1) shell.openExternal(url);
    };

    // demander à l'utilisateur si il souhaite vraiment aller hors du jeu grâce à une popup
    mainWindow.webContents.on('will-navigate', (event, url) => {
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.origin !== BLABLALAND_SITE_ORIGIN) {
          event.preventDefault();
          confirmAndOpenExternal(url);
        }
      } catch (e) {
        event.preventDefault(); // URL invalide, on bloque
      }
    });

    // gestion de nouvelles fenêtres
    // si fenêtre blablaland, nouvelle fenêtre launcher, sinon navigateur externe
    mainWindow.webContents.on('new-window', (event, url) => {
      event.preventDefault();
      try {
        const urlOrigin = new URL(url).origin;
        if (urlOrigin === BLABLALAND_SITE_ORIGIN) {
          const newWin = new BrowserWindow({
            width: 1024,
            height: 768,
            autoHideMenuBar: true,
            icon: path.join(__dirname, 'build/logo.png'),
            webPreferences: {
              contextIsolation: true,
              nodeIntegration: false,
              enableRemoteModule: false,
              plugins: true,
              devTools: isDev
            }
          });
          newWin.loadURL(url);
        } else if (url.startsWith('https://') || url.startsWith('http://')) {
          confirmAndOpenExternal(url);
        }
      } catch (e) {
        // URL invalide, on ignore
      }
    });

    // charger l'URL du jeu dans la fenêtre principale
    mainWindow.loadURL(BLABLALAND_URL);
  };

  const initializeFlashPlugin = () => {
    let pluginName;
    switch (process.platform) {
      case 'win32':
        pluginName = app.isPackaged ? 'pepflashplayer.dll' : 'win/x64/pepflashplayer.dll';
        break;
      case 'darwin':
        pluginName = 'PepperFlashPlayer.plugin';
        break;
      default:
        pluginName = 'libpepflashplayer.so';
    }

    const resourcesPath = app.isPackaged ? process.resourcesPath : __dirname;

    if (['freebsd', 'linux', 'netbsd', 'openbsd'].includes(process.platform)) {
      app.commandLine.appendSwitch('no-sandbox');
    }

    app.commandLine.appendSwitch('ppapi-flash-path', path.join(resourcesPath, 'plugins', pluginName));
    app.commandLine.appendSwitch('ppapi-flash-version', '32.0.0.465');
  };

  app.on('second-instance', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  initializeFlashPlugin();

  app.whenReady().then(() => {
    createMenu();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}
