import fs from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '@shared/types';

const CONFIG_FILE = 'config.json';
const CORRUPT_SUFFIX = '.corrupt';

export function getConfigPath(userData: string): string {
  return path.join(userData, CONFIG_FILE);
}

export function generateUuid(): string {
  return crypto.randomUUID();
}

export function getDefaultConfig(): AppConfig {
  return {
    version: 1,
    theme: 'system',
    window: {
      width: 1280,
      height: 840,
      minimizeToTray: true,
      closeToTray: true,
      launchOnStartup: false,
    },
    hibernation: {
      enabled: true,
      timeoutMinutes: 30,
    },
    privacy: {
      blockWebRtcNonProxiedUdp: true,
    },
    proxy: {
      enabled: false,
      activeProfileId: null,
      profiles: [],
      sshHosts: [],
    },
    services: [
      {
        id: generateUuid(),
        name: 'WhatsApp',
        preset: 'whatsapp',
        url: 'https://web.whatsapp.com',
        muted: false,
        hibernated: false,
        order: 0,
      },
      {
        id: generateUuid(),
        name: 'Telegram',
        preset: 'telegram',
        url: 'https://web.telegram.org/k/',
        muted: false,
        hibernated: false,
        order: 1,
      },
    ],
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge(
  defaults: Record<string, unknown>,
  raw: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...defaults };
  for (const [key, value] of Object.entries(raw)) {
    if (isPlainObject(defaults[key]) && isPlainObject(value)) {
      result[key] = deepMerge(defaults[key] as Record<string, unknown>, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function validateConfig(raw: unknown): AppConfig {
  if (!isPlainObject(raw)) {
    return getDefaultConfig();
  }

  const defaults = getDefaultConfig() as unknown as Record<string, unknown>;
  const merged = deepMerge(defaults, raw) as unknown as AppConfig;

  // Guarantee arrays are arrays (they live under proxy)
  if (!Array.isArray(merged.proxy?.profiles)) {
    merged.proxy.profiles = [];
  }
  if (!Array.isArray(merged.proxy?.sshHosts)) {
    merged.proxy.sshHosts = [];
  }
  if (!Array.isArray(merged.services)) {
    merged.services = getDefaultConfig().services;
  }

  return merged;
}

/**
 * Read config.json from userData. On missing file -> write defaults.
 * On corrupt/unparseable file -> rename to config.json.corrupt and restore defaults.
 */
export function readConfig(userData: string): AppConfig {
  const configPath = getConfigPath(userData);

  try {
    if (!fs.existsSync(configPath)) {
      const defaults = getDefaultConfig();
      writeConfig(userData, defaults);
      return defaults;
    }

    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return validateConfig(parsed);
  } catch (err) {
    // Corruption recovery
    try {
      fs.renameSync(configPath, configPath + CORRUPT_SUFFIX);
    } catch {
      // Ignore rename errors (file may be locked, etc.)
    }
    const defaults = getDefaultConfig();
    try {
      writeConfig(userData, defaults);
    } catch {
      // If we cannot write, still return defaults in memory
    }
    return defaults;
  }
}

/**
 * Atomically write config.json via config.json.tmp then fs.renameSync.
 * Creates the userData directory if it doesn't exist yet.
 */
export function writeConfig(userData: string, config: AppConfig): void {
  fs.mkdirSync(userData, { recursive: true });
  const configPath = getConfigPath(userData);
  const tmpPath = configPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), 'utf-8');
  fs.renameSync(tmpPath, configPath);
}