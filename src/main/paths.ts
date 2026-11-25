import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export interface PathsResult {
  isPortable: boolean;
  userData: string;
  baseDir: string;
}

/**
 * Resolve the application data directory synchronously before app.whenReady().
 *
 * Resolution order (per spec):
 *  1. process.env.PORTABLE_EXECUTABLE_DIR (electron-builder portable .exe) -> isPortable = true
 *  2. portable.flag next to process.execPath (packaged) or process.cwd() (dev) -> isPortable = true
 *  3. Otherwise -> default Electron %APPDATA%\\LiteBox, isPortable = false
 */
export function resolvePaths(): PathsResult {
  let isPortable = false;
  let baseDir: string;

  // 1. PORTABLE_EXECUTABLE_DIR (injected automatically by electron-builder portable .exe)
  const portableEnvDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableEnvDir) {
    isPortable = true;
    baseDir = portableEnvDir;
  } else if (!app.isPackaged) {
    // Dev mode: check for portable.flag next to process.cwd()
    baseDir = process.cwd();
    if (fs.existsSync(path.join(baseDir, 'portable.flag'))) {
      isPortable = true;
    }
  } else {
    // Installed mode: check for portable.flag next to process.execPath
    baseDir = path.dirname(process.execPath);
    if (fs.existsSync(path.join(baseDir, 'portable.flag'))) {
      isPortable = true;
    }
  }

  const userData = isPortable
    ? path.join(baseDir, 'LiteBox-Data')
    : app.getPath('userData');

  return { isPortable, userData, baseDir };
}