import { useEffect, useState } from 'react';
import type { ServiceTab, ProxyStatus, AppConfig } from '@shared/types';
import { Sidebar } from './components/Sidebar';
import { ProxyStatusPill } from './components/ProxyStatusPill';
import { SettingsModal } from './components/SettingsModal';
import { ProxyManagerModal } from './components/ProxyManagerModal';

export default function App() {
  const [runtime, setRuntime] = useState<{
    electron?: string;
    chrome?: string;
    node?: string;
    isPortable?: boolean;
    dataPath?: string;
  } | null>(null);
  const [config, setConfig] = useState<Partial<AppConfig> | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProxyManagerOpen, setIsProxyManagerOpen] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);

  useEffect(() => {
    window.liteboxApi.getRuntimeInfo().then(setRuntime);
    window.liteboxApi.getConfig().then(setConfig);

    // Apply theme on mount
    window.liteboxApi.getNativeTheme().then((theme) => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    });
  }, []);

  const handleSetOverlayOpen = (open: boolean) => {
    setIsOverlayOpen(open);
    window.liteboxApi.setOverlayOpen(open);
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    document.documentElement.classList.remove('light', 'dark');
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.add(isDark ? 'dark' : 'light');
    } else {
      document.documentElement.classList.add(theme);
    }
    window.liteboxApi.setNativeTheme(theme);
    window.liteboxApi.updateConfig({ theme });
  };

  const services = config?.services ?? [];
  const proxyStatus: ProxyStatus = {
    mode: 'DIRECT',
    activeProfileId: null,
    activeProfileName: null,
    type: null,
    localSocksAddress: null,
    tunnelState: 'idle',
    error: null,
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
      {/* Top area: Proxy Status Pill */}
      <div className="fixed top-4 left-20 right-4 z-30 flex justify-between px-2">
        <ProxyStatusPill
          status={proxyStatus}
          onToggle={() => {}}
          onOpenManager={() => setIsProxyManagerOpen(true)}
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              handleSetOverlayOpen(true);
              setIsSettingsOpen(true);
            }}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-accent-foreground"
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Rail */}
      <Sidebar
        services={services}
        activeServiceId={activeServiceId}
        onSelectService={(id) => setActiveServiceId(id)}
        onAddService={() => {}}
        onOpenProxyManager={() => setIsProxyManagerOpen(true)}
        onOpenSettings={() => {
          handleSetOverlayOpen(true);
          setIsSettingsOpen(true);
        }}
      />

      {/* Main viewport (placeholder for WebContentsView) */}
      <div className="fixed left-17 top-0 right-0 bottom-0 bg-background flex items-center justify-center z-0">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mx-auto mb-4 border border-border">
            📦
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">LiteBox</h2>
          <p className="text-muted-foreground text-sm">
            Web service viewport — WebContentsView embeds render here
          </p>
          {runtime && (
            <div className="mt-6 text-xs text-muted-foreground space-y-1">
              <div>Electron: {runtime.electron}</div>
              <div>Chromium: {runtime.chrome}</div>
              <div>Node: {runtime.node}</div>
              <div>Portable: {String(runtime.isPortable)}</div>
              <div>Data Path: {runtime.dataPath}</div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal (overlay protocol enforced) */}
      <SettingsModal
        open={isSettingsOpen}
        config={config ?? {}}
        onClose={() => {
          handleSetOverlayOpen(false);
          setIsSettingsOpen(false);
        }}
        onUpdateConfig={(patch) => {
          setConfig((prev) => ({ ...prev, ...patch } as any));
          if (patch.theme) {
            handleThemeChange(patch.theme);
          }
        }}
        onSetOverlayOpen={handleSetOverlayOpen}
      />

      {/* Proxy Manager Modal (overlay protocol enforced) */}
      <ProxyManagerModal
        open={isProxyManagerOpen}
        onClose={() => {
          handleSetOverlayOpen(false);
          setIsProxyManagerOpen(false);
        }}
        onSetOverlayOpen={handleSetOverlayOpen}
      />
    </div>
  );
}