import { useCallback, useEffect, useState } from 'react';
import type { ServiceTab, ProxyStatus, AppConfig } from '@shared/types';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { ProxyManagerModal } from './components/ProxyManagerModal';
import { AddServiceModal } from './components/AddServiceModal';
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
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(220);

  useEffect(() => {
    window.liteboxApi.getRuntimeInfo().then(setRuntime);

    window.liteboxApi.getConfig().then((cfg) => {
      setConfig(cfg);

      // Activate first service on startup
      if (cfg.services && cfg.services.length > 0) {
        const firstService = cfg.services[0];
        setActiveServiceId(firstService.id);
        window.liteboxApi.serviceActivate(firstService.id);
      }

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
      const width = Math.max(220, Math.min(400, e.clientX));
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

  const handleServiceAdded = (service: ServiceTab) => {
    window.liteboxApi.serviceAdd(service).then(() => {
      setActiveServiceId(service.id);
      window.liteboxApi.serviceActivate(service.id);
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
      <Sidebar
        sidebarWidth={sidebarWidth}
        onResizeStart={handleResizeStart}
        services={services}
        activeServiceId={activeServiceId}
        onSelectService={(id) => {
          setActiveServiceId(id);
          window.liteboxApi.serviceActivate(id);
        }}
        onAddService={() => setIsAddServiceOpen(true)}
        onOpenProxyManager={() => setIsProxyManagerOpen(true)}
        onOpenSettings={() => {
          handleSetOverlayOpen(true);
          setIsSettingsOpen(true);
        }}
      />

      <div
        className="fixed top-0 bottom-0 w-1 cursor-ew-resize z-30 bg-transparent"
        style={{ left: `${sidebarWidth}px` }}
        onMouseDown={handleResizeStart}
      />

      <div
        className="fixed top-0 right-0 bottom-0 bg-background z-0 flex flex-col"
        style={{ left: `${sidebarWidth}px` }}
      >
        <div className="flex-1 flex items-center justify-center bg-background">
          {activeServiceId ? (
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-card flex items-center justify-center mx-auto mb-4 border border-border">
                {(() => {
                  const svc = services.find((s) => s.id === activeServiceId);
                  if (!svc) return null;
                  if (svc.preset === 'whatsapp') {
                    return <MessageCircle className="w-10 h-10 text-muted-foreground" />;
                  }
                  if (svc.preset === 'telegram') {
                    return <Send className="w-10 h-10 text-muted-foreground" />;
                  }
                  return <Globe className="w-10 h-10 text-muted-foreground" />;
                })()}
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                {services.find((s) => s.id === activeServiceId)?.name}
              </h2>
              <p className="text-muted-foreground text-sm">
                WebContentsView embed renders here — ready for proxy/tunnel routing
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center mx-auto mb-4 border border-border">
                📦
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">LiteBox</h2>
              <p className="text-muted-foreground text-sm">
                Select a service from the sidebar to begin
              </p>
            </div>
          )}
        </div>
      </div>

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

      <ProxyManagerModal
        open={isProxyManagerOpen}
        onClose={() => {
          handleSetOverlayOpen(false);
          setIsProxyManagerOpen(false);
        }}
        onSetOverlayOpen={handleSetOverlayOpen}
      />

      <AddServiceModal
        open={isAddServiceOpen}
        onClose={() => setIsAddServiceOpen(false)}
        onSetOverlayOpen={handleSetOverlayOpen}
        onServiceAdded={handleServiceAdded}
      />
    </div>
  );
}
