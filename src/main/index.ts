import { app, BrowserWindow, shell, ipcMain, nativeTheme } from 'electron';
import path from 'node:path';
import type { AppConfig, RuntimeInfo, IPCChannel, ServiceTab } from '@shared/types';
import { IPC_CHANNELS } from '@shared/types';
import { resolvePaths } from './paths';
import {
  readConfig,
  writeConfig,
  getDefaultConfig,
} from './configStore';
import { ViewManager } from './viewManager';

// --- Chromium flags: Zero Local DNS Leaks (BEFORE app.whenReady) ---
app.commandLine.appendSwitch('host-resolver-rules', 'MAP * ~NOTFOUND , EXCLUDE 127.0.0.1');
app.commandLine.appendSwitch('disable-features', 'AsyncDns');

// --- Portable vs. installed path resolution (BEFORE app.whenReady) ---
const paths = resolvePaths();
app.setPath('userData', paths.userData);

// --- Config store (atomic read/write, corruption recovery) ---
let currentConfig: AppConfig = readConfig(paths.userData);

let mainWindow: BrowserWindow | null = null;
let viewManager: ViewManager | null = null;

async function createWindow() {
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
    const url = process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL!;
    // Wait for Vite dev server to be ready - longer delay for Vite to fully start
    await new Promise(r => setTimeout(r, 10000));
    mainWindow.loadURL(url);
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

  mainWindow.on('resize', () => {
    viewManager?.updateBounds();
  });
  mainWindow.on('maximize', () => {
    viewManager?.updateBounds();
  });
  mainWindow.on('unmaximize', () => {
    viewManager?.updateBounds();
  });

  return mainWindow;
}

app.whenReady().then(async () => {
  await createWindow();
  viewManager = new ViewManager(mainWindow!);

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
    viewManager?.setOverlayOpen(open);
  });
  ipcMain.handle(IPC_CHANNELS.SERVICES_GET, () => currentConfig.services);
  ipcMain.handle(IPC_CHANNELS.SERVICE_ADD, async (_e, service: ServiceTab) => {
    currentConfig.services = [...currentConfig.services, service];
    writeConfig(paths.userData, currentConfig);
    if (viewManager) {
      await viewManager.createView(service.id, service.url);
      if (currentConfig.services.length === 1) {
        await viewManager.activateService(service.id);
      }
    }
  });
  ipcMain.handle(IPC_CHANNELS.SERVICE_ACTIVATE, async (_e, id: string) => {
    await viewManager?.activateService(id);
  });
  ipcMain.handle(IPC_CHANNELS.SERVICE_REMOVE, async (_e, id: string) => {
    currentConfig.services = currentConfig.services.filter((s) => s.id !== id);
    writeConfig(paths.userData, currentConfig);
    await viewManager?.destroyView(id);
  });
  ipcMain.handle(IPC_CHANNELS.NATIVE_THEME_GET, () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });
  ipcMain.handle(IPC_CHANNELS.NATIVE_THEME_SET, (_e, theme: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = theme;
  });

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});