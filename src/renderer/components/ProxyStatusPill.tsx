import { useCallback } from 'react';
import { ShieldAlert, Wifi, ShieldCheck, ShieldOff, Zap, Clock } from 'lucide-react';
import type { ProxyStatus } from '@shared/types';

type LucideIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface ProxyStatusPillProps {
  status: ProxyStatus;
  onToggle: () => void;
  onOpenManager: () => void;
}

const STATE_CONFIG: Record<
  ProxyStatus['mode'],
  { icon: LucideIcon; label: string; className: string }
> = {
  DIRECT: { icon: Wifi, label: 'Direct', className: 'bg-gray-600 text-gray-200' },
  PROXY_ACTIVE: {
    icon: ShieldCheck,
    label: 'Proxy Active',
    className: 'bg-green-600 text-green-100',
  },
  KILL_SWITCH_LOCKED: { icon: ShieldAlert, label: 'Kill Switch Locked', className: 'bg-red-600 text-red-100' },
};

export function ProxyStatusPill({ status, onToggle, onOpenManager }: ProxyStatusPillProps) {
  const state = STATE_CONFIG[status.mode];
  const isAmber = status.mode === 'PROXY_ACTIVE' && status.tunnelState === 'connecting';
  const pillClass = isAmber ? 'bg-amber-600 text-amber-100 animate-pulse' : state.className;

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
    status.type ? `${status.type.toUpperCase()}` : null,
    status.localSocksAddress ?? null,
    status.error ?? null,
  ]
    .filter(Boolean)
    .join(' | ');

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium border border-white/10 cursor-pointer transition-colors ${pillClass}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={tooltipText}
    >
      <state.icon className="w-3.5 h-3.5" />
      <span className="whitespace-nowrap">{state.label}</span>
      {isAmber && <Clock className="w-3 h-3 animate-spin ml-1" />}
    </div>
  );
}