import { useEffect, useState } from 'react';
import { X, Sun, Moon, Monitor, Clock, ToggleRight, ToggleLeft } from 'lucide-react';
import type { AppConfig } from '@shared/types';

interface SettingsModalProps {
  open: boolean;
  config: Partial<AppConfig>;
  onClose: () => void;
  onUpdateConfig: (patch: Partial<AppConfig>) => void;
  onSetOverlayOpen: (open: boolean) => void;
}

const TIMEOUT_OPTIONS = [10, 15, 30, 60, 120];

export function SettingsModal({
  open,
  config,
  onClose,
  onUpdateConfig,
  onSetOverlayOpen,
}: SettingsModalProps) {
  if (!open) return null;

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
    (config.theme as 'light' | 'dark' | 'system') ?? 'system'
  );
  const [hibernationEnabled, setHibernationEnabled] = useState(
    config.hibernation?.enabled ?? true
  );
  const [timeoutMinutes, setTimeoutMinutes] = useState(
    config.hibernation?.timeoutMinutes ?? 30
  );

  useEffect(() => {
    onSetOverlayOpen(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSetOverlayOpen(false);
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      onSetOverlayOpen(false);
    };
  }, [open, onSetOverlayOpen, onClose]);

  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    setTheme(value);
    onUpdateConfig({ theme: value });
  };

  const handleHibernationToggle = () => {
    const enabled = !hibernationEnabled;
    setHibernationEnabled(enabled);
    onUpdateConfig({
      hibernation: {
        enabled,
        timeoutMinutes: config.hibernation?.timeoutMinutes ?? 30,
      },
    });
  };

  const handleTimeoutChange = (value: number) => {
    setTimeoutMinutes(value);
    onUpdateConfig({
      hibernation: {
        enabled: config.hibernation?.enabled ?? true,
        timeoutMinutes: value,
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          onSetOverlayOpen(false);
          onClose();
        }}
      />

      <div className="relative bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={() => {
              onSetOverlayOpen(false);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-300">Theme</h3>
                <p className="text-xs text-gray-500">Appearance for the LiteBox shell</p>
              </div>
              <div className="flex gap-1">
                {['light', 'dark', 'system'].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleThemeChange(t as 'light' | 'dark' | 'system')}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                      theme === t
                        ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                    }`}
                    title={t.charAt(0).toUpperCase() + t.slice(1)}
                  >
                    {t === 'light' && <Sun className="w-4 h-4" />}
                    {t === 'dark' && <Moon className="w-4 h-4" />}
                    {t === 'system' && <Monitor className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-300">Tab Hibernation</h3>
                  <p className="text-xs text-gray-500">Automatically hibernate inactive tabs</p>
                </div>
                <button
                  onClick={handleHibernationToggle}
                  className={`relative inline-flex w-11 h-6 shrink-0 cursor-pointer rounded-full transition-colors ${
                    hibernationEnabled ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    hibernationEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">Timeout:</span>
                <div className="flex gap-1">
                  {TIMEOUT_OPTIONS.map((m) => (
                    <button
                      key={m}
                      disabled={!hibernationEnabled}
                      onClick={() => handleTimeoutChange(m)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:pointer-events-none ${
                        timeoutMinutes === m
                          ? 'bg-blue-600 text-white'
                          : hibernationEnabled
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                          : 'bg-gray-800 text-gray-500'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-[10px] text-gray-500">
          Proxy & SSH Tunnel settings are available from the Proxy Manager.
        </div>
      </div>
    </div>
  );
}