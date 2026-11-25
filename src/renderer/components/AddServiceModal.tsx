import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { ServiceTab } from '@shared/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/renderer/components/ui/dialog';
import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
import { Separator } from '@/renderer/components/ui/separator';
import { Button } from '@/renderer/components/ui/button';

const PRESETS: Array<{
  id: 'whatsapp' | 'telegram' | 'telegram-a' | 'custom';
  name: string;
  url: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    url: 'https://web.whatsapp.com',
    icon: <span>💬</span>,
  },
  {
    id: 'telegram',
    name: 'Telegram (Web K)',
    url: 'https://web.telegram.org/k/',
    icon: <span>📎</span>,
  },
  {
    id: 'telegram-a',
    name: 'Telegram (Web A)',
    url: 'https://web.telegram.org/a/',
    icon: <span>📎</span>,
  },
  {
    id: 'custom',
    name: 'Custom Web App',
    url: '',
    icon: <span>🌐</span>,
  },
];

interface AddServiceModalProps {
  open: boolean;
  onClose: () => void;
  onSetOverlayOpen: (open: boolean) => void;
  onServiceAdded: (service: ServiceTab) => void;
}

export function AddServiceModal({
  open,
  onClose,
  onSetOverlayOpen,
  onServiceAdded,
}: AddServiceModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<'whatsapp' | 'telegram' | 'telegram-a' | 'custom'>('whatsapp');
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');

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

  const preset = PRESETS.find((p) => p.id === selectedPreset)!;
  const isCustom = selectedPreset === 'custom';

  const handleAdd = () => {
    if (isCustom) {
      if (!customName || !customUrl) return;
      try {
        new URL(customUrl);
      } catch {
        return;
      }
      onServiceAdded({
        id: crypto.randomUUID(),
        name: customName,
        preset: 'custom',
        url: customUrl,
        muted: false,
        hibernated: false,
        order: 0,
      });
    } else {
      onServiceAdded({
        id: crypto.randomUUID(),
        name: preset.name,
        preset: selectedPreset,
        url: preset.url,
        muted: false,
        hibernated: false,
        order: 0,
      });
    }
    onSetOverlayOpen(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
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
          <DialogTitle>Add Service</DialogTitle>
          <DialogDescription>
            Add WhatsApp Web, Telegram Web, or a custom web application
          </DialogDescription>
        </DialogHeader>
        <Separator className="my-4" />
        <div className="grid gap-4 p-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Service</Label>
            <div className="flex flex-col gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPreset(p.id as any);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-sm ${
                    selectedPreset === p.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <span className="w-5 h-5 shrink-0">{p.icon}</span>
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{p.url}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          {isCustom && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Display Name</Label>
                <Input
                  placeholder="e.g. My Web App"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">URL</Label>
                <Input
                  placeholder="https://example.com"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Must be a valid http:// or https:// URL
                </p>
              </div>
            </div>
          )}
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
            onClick={handleAdd}
            className="h-9 whitespace-nowrap shrink-0"
            disabled={isCustom ? (!customName || !customUrl) : false}
          >
            Add Service
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
