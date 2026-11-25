import { app, BrowserWindow, shell, ipcMain, nativeTheme } from 'electron';
import path from 'node:path';
import type { AppConfig, RuntimeInfo, IPCChannel } from '@shared/types';
import { IPC_CHANNELS } from '@shared/types';
import { resolvePaths } from './paths';
import {
  readConfig,
  writeConfig,
  getDefaultConfig,
} from './configStore';

// --- Portable vs. installed path resolution (BEFORE app.whenReady) ---
const paths = resolvePaths();
app.setPath('userData', paths.userData);

// --- Config store (atomic read/write, corruption recovery) ---
let currentConfig: AppConfig = readConfig(paths.userData);

let mainWindow: BrowserWindow | null = null;

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

  if (process.env.ELECTRON_RENDERER_URL || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL!);
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

  ipcMain.handle(IPC_CHANNELS.GET_CONFIG, () => currentConfig);
  ipcMain.handle(IPC_CHANNELS.UPDATE_CONFIG, (_e, patch: Partial<AppConfig>) => {
    currentConfig = { ...currentConfig, ...patch };
    writeConfig(paths.userData, currentConfig);
  });
  ipcMain.handle(IPC_CHANNELS.GET_RUNTIME_INFO, (): RuntimeInfo => {
    const { versions } = process;
    return {
      electron: versions.electron ?? '',
      chrome: versions.chrome ?? '',
      node: versions.node ?? '',
      isPortable: paths.isPortable,
      dataPath: paths.userData,
    };
  });
  ipcMain.on(IPC_CHANNELS.SET_OVERLAY_OPEN, (_e, open: boolean) => {
    // Overlay protocol - WebContentsView detach/attach handled in viewManager (Phase 2)
    void open;
  });
  ipcMain.handle(IPC_CHANNELS.NATIVE_THEME_GET, () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });
  ipcMain.handle(IPC_CHANNELS.NATIVE_THEME_SET, (_e, theme: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = theme;
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});