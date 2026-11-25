import { useCallback } from 'react';
import { ShieldAlert, Wifi, ShieldCheck, Clock } from 'lucide-react';
import type { ProxyStatus } from '@shared/types';
import { Button } from '@/renderer/components/ui/button';
import { Badge } from '@/renderer/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/renderer/components/ui/tooltip';

type LucideIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface ProxyStatusPillProps {
  status: ProxyStatus;
  onToggle: () => void;
  onOpenManager: () => void;
}

const STATE_CONFIG: Record<
  ProxyStatus['mode'],
  { icon: LucideIcon; label: string; variant: 'secondary' | 'default' | 'destructive' | 'outline' }
> = {
  DIRECT: { icon: Wifi, label: 'Direct', variant: 'secondary' },
  PROXY_ACTIVE: { icon: ShieldCheck, label: 'Proxy Active', variant: 'default' },
  KILL_SWITCH_LOCKED: { icon: ShieldAlert, label: 'Kill Switch Locked', variant: 'destructive' },
};

export function ProxyStatusPill({ status, onToggle, onOpenManager }: ProxyStatusPillProps) {
  const state = STATE_CONFIG[status.mode];
  const isAmber = status.mode === 'PROXY_ACTIVE' && status.tunnelState === 'connecting';
  const pillVariant = isAmber ? 'secondary' : state.variant;
  const pillClass = isAmber ? 'bg-amber-600/20 text-amber-400 border-amber-500/30 animate-pulse' : '';

  const handleClick = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      onOpenManager();
    } else {
      onToggle();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onOpenManager();
  };

  const tooltipText = [
    status.activeProfileName ?? state.label,
    status.mode === 'DIRECT'
      ? 'Direct connection — no proxy, traffic goes straight to the internet (no leak protection)'
      : status.type ? `${status.type.toUpperCase()}` : null,
    status.localSocksAddress ?? null,
    status.error ?? null,
  ]
    .filter(Boolean)
    .join(' | ');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            variant={pillVariant}
            size="sm"
            className={`flex items-center gap-2 px-3 py-2 rounded-full border border-input transition-colors whitespace-nowrap shrink-0 ${pillClass}`}
            aria-label={tooltipText || state.label}
          >
            <state.icon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{state.label}</span>
            {isAmber && <Clock className="w-3 h-3 animate-spin ml-1" />}
            {status.localSocksAddress && (
              <Badge variant="outline" className="ml-2 text-[10px] whitespace-nowrap shrink-0">
                {status.localSocksAddress}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}