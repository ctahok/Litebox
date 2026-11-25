import { useCallback, useEffect, useState } from 'react';
import type { ServiceTab, ProxyStatus, AppConfig } from '@shared/types';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { ProxyManagerModal } from './components/ProxyManagerModal';
import { MessageCircle, Send, Globe } from 'lucide-react';

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
  const [sidebarWidth, setSidebarWidth] = useState(68);

  useEffect(() => {
    window.liteboxApi.getRuntimeInfo().then(setRuntime);

    window.liteboxApi.getConfig().then((cfg) => {
      setConfig(cfg);

      // Apply theme on mount
      window.liteboxApi.getNativeTheme().then((nativeTheme) => {
        document.documentElement.classList.remove('light', 'system-light', 'dark');
        if (cfg.theme === 'system') {
          document.documentElement.classList.add(
            nativeTheme === 'dark' ? 'dark' : 'system-light',
          );
        } else {
          document.documentElement.classList.add(cfg.theme);
        }
      });
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
      document.documentElement.classList.add(isDark ? 'dark' : 'system-light');
    } else {
      document.documentElement.classList.add(theme);
    }
    window.liteboxApi.setNativeTheme(theme);
    window.liteboxApi.updateConfig({ theme });
  };

  const handleResizeStart = useCallback(() => {
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }, []);

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      const width = Math.max(68, Math.min(300, e.clientX));
      setSidebarWidth(width);
    },
    [],
  );

  const handleResizeEnd = useCallback(() => {
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);

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
      {/* Rail */}
      <Sidebar
        sidebarWidth={sidebarWidth}
        onResizeStart={handleResizeStart}
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

      {/* Resizable divider */}
      <div
        className="fixed top-0 bottom-0 w-1 cursor-ew-resize z-30 bg-transparent"
        style={{ left: `${sidebarWidth}px` }}
        onMouseDown={handleResizeStart}
      />

      {/* Main viewport with service tabs */}
      <div
        className="fixed top-0 right-0 bottom-0 bg-background z-0 flex flex-col"
        style={{ left: `${sidebarWidth}px` }}
      >
        {/* Service tab bar */}
        <div className="flex items-center gap-1 px-4 py-3 border-b border-border bg-background/50">
          {services.map((service) => {
            const isActive = activeServiceId === service.id;
            return (
              <button
                key={service.id}
                onClick={() => setActiveServiceId(service.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {service.preset === 'whatsapp' && <MessageCircle className="w-4 h-4" />}
                {service.preset === 'telegram' && <Send className="w-4 h-4" />}
                {service.preset === 'custom' && <Globe className="w-4 h-4" />}
                <span>{service.name}</span>
              </button>
            );
          })}
        </div>

        {/* WebContentsView area (placeholder for actual views) */}
        <div className="flex-1 flex items-center justify-center bg-background">
          {activeServiceId ? (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center mx-auto mb-4 border border-border">
                {(() => {
                  const svc = services.find((s) => s.id === activeServiceId);
                  if (!svc) return null;
                  if (svc.preset === 'whatsapp') {
                    return <MessageCircle className="w-8 h-8 text-muted-foreground" />;
                  }
                  if (svc.preset === 'telegram') {
                    return <Send className="w-8 h-8 text-muted-foreground" />;
                  }
                  return <Globe className="w-8 h-8 text-muted-foreground" />;
                })()}
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {services.find((s) => s.id === activeServiceId)?.name}
              </h2>
              <p className="text-muted-foreground text-sm">
                WebContentsView embed renders here — ready for proxy/tunnel routing
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mx-auto mb-4 border border-border">
                📦
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">LiteBox</h2>
              <p className="text-muted-foreground text-sm">
                Select a service from the sidebar to begin
              </p>
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