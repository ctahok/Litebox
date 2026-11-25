import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import type { AppConfig } from '@shared/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/renderer/components/ui/dialog';
import { Switch } from '@/renderer/components/ui/switch';
import { Separator } from '@/renderer/components/ui/separator';
import { Label } from '@/renderer/components/ui/label';
import { Badge } from '@/renderer/components/ui/badge';
import { Button } from '@/renderer/components/ui/button';

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
    <Dialog open={open} onOpenChange={(open: boolean) => {
      if (!open) {
        onSetOverlayOpen(false);
        onClose();
      }
    }}>
      <DialogTrigger asChild>
        <span />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure LiteBox appearance and behavior
          </DialogDescription>
        </DialogHeader>
        <Separator className="my-4" />
        <div className="grid gap-4 p-4">
          {/* Theme Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Theme</Label>
            <p className="text-xs text-muted-foreground">
              Appearance for the LiteBox shell
            </p>
            <div className="flex gap-1">
              {['light', 'dark', 'system'].map((t) => (
                <Button
                  key={t}
                  onClick={() => handleThemeChange(t as 'light' | 'dark' | 'system')}
                  className={`h-8 w-8 rounded-md flex items-center justify-center text-xs font-medium transition-all ${
                    theme === t
                      ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary-rgb),0.4)]'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                  aria-label={t.charAt(0).toUpperCase() + t.slice(1)}
                >
                  {t === 'light' && <Sun className="w-4 h-4" />}
                  {t === 'dark' && <Moon className="w-4 h-4" />}
                  {t === 'system' && <Monitor className="w-4 h-4" />}
                </Button>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Tab Hibernation Section - Redesigned with shadcn Switch */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Tab Hibernation</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically hibernate inactive tabs to save memory
                </p>
              </div>
              <Switch
                checked={hibernationEnabled}
                onCheckedChange={handleHibernationToggle}
                className="h-9 w-12"
              />
            </div>
            <div className="flex items-center gap-3 pl-8">
              <Label className="text-sm text-muted-foreground">Timeout:</Label>
              <div className="flex gap-1">
                {TIMEOUT_OPTIONS.map((m) => (
                  <Button
                    key={m}
                    disabled={!hibernationEnabled}
                    onClick={() => handleTimeoutChange(m)}
                    className={`h-9 w-9 rounded-md text-xs font-medium transition-all disabled:opacity-50 disabled:pointer-events-none ${
                      timeoutMinutes === m
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onSetOverlayOpen(false);
              onClose();
            }}
            className="h-9 whitespace-nowrap shrink-0"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSetOverlayOpen(false);
              onClose();
            }}
            className="h-9 whitespace-nowrap shrink-0"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}