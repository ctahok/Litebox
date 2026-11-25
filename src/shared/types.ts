export type Theme = 'light' | 'dark' | 'system';

export interface ServiceTab {
  id: string;
  name: string;
  preset: 'whatsapp' | 'telegram' | 'telegram-a' | 'custom';
  url: string;
  muted: boolean;
  hibernated: boolean;
  order: number;
  unreadCount?: number;
  lastActiveAt?: number;
}

export interface ProxyStatus {
  mode: 'DIRECT' | 'PROXY_ACTIVE' | 'KILL_SWITCH_LOCKED';
  activeProfileId: string | null;
  activeProfileName: string | null;
  type: 'standard' | 'ssh_tunnel' | null;
  localSocksAddress: string | null;
  tunnelState: 'idle' | 'connecting' | 'ready' | 'reconnecting' | 'locked' | 'error';
  error: string | null;
}

export interface TunnelState {
  sshHostId: string | null;
  state: 'idle' | 'connecting' | 'ready' | 'reconnecting' | 'stopped' | 'locked';
  localSocksPort: number | null;
  error: string | null;
  fingerprint: string | null;
  hostKeyStatus: 'trusted' | 'unknown' | 'mismatch' | null;
}

export interface StandardProxyProfile {
  id: string;
  name: string;
  type: 'standard';
  protocol: 'socks5' | 'socks4' | 'http' | 'https';
  host: string;
  port: number;
  username: string | null;
  encryptedPasswordB64: string | null;
  requiresReauth: boolean;
}

export interface SshTunnelProfile {
  id: string;
  name: string;
  type: 'ssh_tunnel';
  sshHostId: string;
  localSocksHost: string;
  localSocksPort: number;
  autoReconnect: boolean;
}

export type ProxyProfile = StandardProxyProfile | SshTunnelProfile;

export interface SshHostConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'privateKey';
  encryptedPasswordB64: string | null;
  keySource: 'inline' | 'path';
  encryptedPrivateKeyB64: string | null;
  privateKeyPath: string | null;
  encryptedPassphraseB64: string | null;
  jumpHostId: string | null;
  knownHostFingerprint: string | null;
  keepaliveIntervalSec: number;
  requiresReauth: boolean;
}

export interface WindowConfig {
  width: number;
  height: number;
  minimizeToTray: boolean;
  closeToTray: boolean;
  launchOnStartup: boolean;
}

export interface HibernationConfig {
  enabled: boolean;
  timeoutMinutes: number;
}

export interface PrivacyConfig {
  blockWebRtcNonProxiedUdp: boolean;
}

export interface ProxyConfig {
  enabled: boolean;
  activeProfileId: string | null;
  profiles: ProxyProfile[];
  sshHosts: SshHostConfig[];
}

export interface AppConfig {
  version: number;
  theme: Theme;
  window: WindowConfig;
  hibernation: HibernationConfig;
  privacy: PrivacyConfig;
  proxy: ProxyConfig;
  services: ServiceTab[];
}

export interface RuntimeInfo {
  electron: string;
  chrome: string;
  node: string;
  isPortable: boolean;
  dataPath: string;
}

export const IPC_CHANNELS = {
  GET_CONFIG: 'config:get',
  UPDATE_CONFIG: 'config:update',
  GET_RUNTIME_INFO: 'runtime:get',
  SET_OVERLAY_OPEN: 'ui:set-overlay-open',
  NATIVE_THEME_GET: 'native-theme:get',
  NATIVE_THEME_SET: 'native-theme:set',
} as const;

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

declare global {
  interface Window {
    liteboxApi: {
      getConfig: () => Promise<AppConfig>;
      updateConfig: (patch: Partial<AppConfig>) => Promise<void>;
      getRuntimeInfo: () => Promise<RuntimeInfo>;
      setOverlayOpen: (open: boolean) => void;
      getNativeTheme: () => Promise<'light' | 'dark'>;
      setNativeTheme: (theme: 'light' | 'dark' | 'system') => void;
    };
  }
}