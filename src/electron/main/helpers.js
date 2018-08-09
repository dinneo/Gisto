const {
  shell, app, Menu
} = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { init } = require('@sentry/electron');

const isMacOS = process.platform === 'darwin';
const packageJson = require('../package');

function initSentry() {
  init({
    dsn: 'https://9b448264479b47418f9e248c208632ae@sentry.io/1245680',
    release: app.getVersion(),
    environment: process.env.NODE_ENV
  });
}

function installDevToolsExtentions() {
  const {
    default: installExtension, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS, REACT_PERF
  } = require('electron-devtools-installer');
  
  installExtension([REACT_DEVELOPER_TOOLS.id, REDUX_DEVTOOLS.id, REACT_PERF.id])
    .then((extensionName) => console.log(`Added Extension:  ${extensionName}`))
    .catch((err) => console.log('An error occurred: ', err));

  console.log('\x1b[37m\x1b[41m', 'LOG ', '\x1b[0m', process.env.NODE_ENV);
}

function sendStatusToWindow(text, info, targetWindow, channel = 'updateInfo') {
  targetWindow.webContents.send(channel, text, info);
}

function handleDownload(win) {
  win.webContents.session.on('will-download', (event, item, sender) => {
    item.on('updated', (updateEvent, state) => {
      if (state === 'interrupted') {
        console.log('Download is interrupted but can be resumed');
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          sender.send('updateInfo', 'Download paused');
        } else {
          const downloaded = item.getReceivedBytes() / 1048576;
          const total = item.getTotalBytes() / 1048576;

          sender.send('updateInfo', `Downloaded: ${Math.ceil((downloaded / total) * 100)}%`);
        }
      }
    });
    item.once('done', (doneEvent, state) => {
      if (state === 'completed') {
        sender.send('updateInfo', 'Download finished, please close Gisto and install');
      } else {
        sender.send('updateInfo', `Download failed: ${state}`);
      }
    });
  });
}

function handleNavigate(win) {
  // Handled URL opening in default browser
  win.webContents.on('will-navigate', (event, url) => {
    if (url.match(/https:\/\/gisto-releases\.s3\.amazonaws\.com/i).length > 0) {
      return false;
    }

    event.preventDefault();
    shell.openExternal(url);

    return true;
  });
}

function setBadge(badge) {
  app.dock.setBadge(badge);
}

function buildMenu(mainWindow) {
  const template = [];
  const name = app.getName();

  template.unshift(
    {
      label: name,
      submenu: [
        {
          label: `About ${name}`,
          role: 'about'
        },
        {
          label: 'Services',
          role: 'services',
          submenu: []
        },
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: () => mainWindow.webContents.reload()
        },
        {
          label: 'Console',
          click: () => mainWindow.webContents.openDevTools()
        },
        {
          label: 'Check for updates',
          click: (menuItem, focusedWindow, event) => require('../updater').checkForUpdates(menuItem, focusedWindow, event),
          visible: !isMacOS
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' }
      ]
    }, {
      label: 'View',
      submenu: [{
        label: 'Toggle Full Screen',
        accelerator: 'Ctrl+Command+F',
        click: (item, focusedWindow) => {
          if (focusedWindow) {
            focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
          }
        }
      }]
    }, {
      label: 'Help',
      submenu: [{
        label: `Learn More about ${name}`,
        click() {
          shell.openExternal('https://www.gistoapp.com');
        }
      }, {
        label: 'Documentation',
        click() {
          shell.openExternal('https://www.gistoapp.com/documentation/');
        }
      }, {
        label: 'Announcements',
        click() {
          shell.openExternal('https://www.gistoapp.com/blog/');
        }
      }, {
        label: 'Search Issues',
        click() {
          shell.openExternal('https://github.com/gisto/gisto/issues');
        }
      }]
    }
  );

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function handleMacOSUpdates(mainWindow) {
  const LATEST_RELEASED_VERSION_URL = 'https://gisto-releases.s3.amazonaws.com/latest-mac.json';

  if (isMacOS) {
    const request = require('superagent');
    const semver = require('semver');

    sendStatusToWindow('Gisto checking for new version...', {}, mainWindow, 'updateInfo');

    request
      .get(LATEST_RELEASED_VERSION_URL)
      .end((error, result) => {
        if (result) {
          const shouldUpdate = semver.lt(packageJson.version, result.body.version);

          if (shouldUpdate) {
            sendStatusToWindow(`Update from ${packageJson.version} to ${result.body.version} available`, result.body, mainWindow, 'updateInfo');
          } else {
            sendStatusToWindow('No updates available at the moment', {}, mainWindow, 'updateInfo');
          }
        }
        if (error) {
          sendStatusToWindow('No new version information at the moment', {}, mainWindow, 'updateInfo');
        }
      });
  }
}

function updateChecker(mainWindow) {
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';

  autoUpdater.checkForUpdates();

  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for update...', {}, mainWindow, 'updateInfo');
  });

  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('Update available', info, mainWindow, 'updateInfo');
  });

  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('No updates available at the moment', info, mainWindow, 'updateInfo');
  });

  autoUpdater.on('error', (err) => {
    if (!isMacOS) {
      sendStatusToWindow(`Error in auto-updater ${err}`, {}, mainWindow, 'updateInfo');
    } else {
      handleMacOSUpdates(mainWindow);
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;

    logMessage = `${logMessage} - Downloaded ${progressObj.percent}%`;
    logMessage = `${logMessage} (${progressObj.transferred}/${progressObj.total})`;
    sendStatusToWindow(logMessage, {}, mainWindow, 'updateInfo');
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('Update downloaded', info, mainWindow, 'updateInfo');
  });
}

module.exports = {
  initSentry,
  installDevToolsExtentions,
  handleDownload,
  handleNavigate,
  setBadge,
  buildMenu,
  updateChecker,
  handleMacOSUpdates
};
