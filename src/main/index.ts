import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';
import type { AppConfig, RuntimeInfo, IPCChannel } from '@shared/types';

let mainWindow: BrowserWindow | null = null;

const DEFAULT_CONFIG: AppConfig = {
  version: 1,
  theme: 'system',
  window: { width: 1280, height: 840, minimizeToTray: true, closeToTray: true, launchOnStartup: false },
  hibernation: { enabled: true, timeoutMinutes: 30 },
  privacy: { blockWebRtcNonProxiedUdp: true },
  proxy: { enabled: false, activeProfileId: null, profiles: [], sshHosts: [] },
  services: [],
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/shellPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const scheme = new URL(url).protocol;
      if (scheme === 'http:' || scheme === 'https:') {
        void shell.openExternal(url);
      }
    } catch {}
    return { action: 'deny' };
  });

  return mainWindow;
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle(IPC_CHANNELS.GET_CONFIG, () => DEFAULT_CONFIG);
  ipcMain.handle(IPC_CHANNELS.UPDATE_CONFIG, (_e, patch: Partial<AppConfig>) => {
    Object.assign(DEFAULT_CONFIG, patch);
  });
  ipcMain.handle(IPC_CHANNELS.GET_RUNTIME_INFO, (): RuntimeInfo => {
    const { versions } = process;
    return {
      electron: versions.electron ?? '',
      chrome: versions.chrome ?? '',
      node: versions.node ?? '',
      isPortable: false,
      dataPath: '',
    };
  });
  ipcMain.on(IPC_CHANNELS.SET_OVERLAY_OPEN, (_e, open: boolean) => {
    // Overlay protocol - WebContentsView detach/attach handled in viewManager (Phase 2)
    void open;
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});