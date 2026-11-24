import { contextBridge, ipcRenderer } from 'electron';
import type { AppConfig, IPCChannel, RuntimeInfo } from '@shared/types';

contextBridge.exposeInMainWorld('liteboxApi', {
  getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CONFIG),
  updateConfig: (patch: Partial<AppConfig>) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CONFIG, patch),
  getRuntimeInfo: () => ipcRenderer.invoke(IPC_CHANNELS.GET_RUNTIME_INFO),
  setOverlayOpen: (open: boolean) => ipcRenderer.send(IPC_CHANNELS.SET_OVERLAY_OPEN, open),
});