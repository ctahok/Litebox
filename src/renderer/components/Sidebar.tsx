import { useCallback } from 'react';
import {
  MessageCircle,
  Send,
  Globe,
  Plus,
  Shield,
  Settings,
  Moon,
  VolumeX,
} from 'lucide-react';
import type { ServiceTab } from '@shared/types';
import { Button } from '@/renderer/components/ui/button';
import { Badge } from '@/renderer/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/renderer/components/ui/tooltip';
import { ProxyStatusPill } from './ProxyStatusPill';

type LucideIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface SidebarProps {
  sidebarWidth: number;
  onResizeStart: () => void;
  services: ServiceTab[];
  activeServiceId: string | null;
  onSelectService: (id: string) => void;
  onAddService: () => void;
  onOpenProxyManager: () => void;
  onOpenSettings: () => void;
}

const PRESET_ICONS: Record<string, LucideIcon> = {
  whatsapp: MessageCircle,
  telegram: Send,
  'telegram-a': Send,
  custom: Globe,
};

export function Sidebar({
  sidebarWidth,
  onResizeStart,
  services,
  activeServiceId,
  onSelectService,
  onAddService,
  onOpenProxyManager,
  onOpenSettings,
}: SidebarProps) {
  const handleServiceClick = useCallback(
    (id: string) => {
      onSelectService(id);
    },
    [onSelectService],
  );

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 bg-background border-r border-border flex flex-col z-20"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div className="px-3 pt-3 pb-2">
        <ProxyStatusPill
          status={{ mode: 'DIRECT', activeProfileId: null, activeProfileName: null, type: null, localSocksAddress: null, tunnelState: 'idle', error: null }}
          onToggle={() => {}}
          onOpenManager={onOpenProxyManager}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 gap-1">
        {services.map((service) => {
          const isActive = activeServiceId === service.id;
          const Icon = PRESET_ICONS[service.preset] ?? Globe;
          return (
            <div
              key={service.id}
              onClick={() => handleServiceClick(service.id)}
              className={`relative group cursor-pointer rounded-lg px-3 py-2.5 flex items-center gap-3 transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary hover:text-foreground'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
              )}
              <Icon
                className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}
              />
              <span className={`flex-1 truncate text-sm font-medium ${
                isActive ? 'text-primary-foreground' : 'text-foreground'
              }`}>
                {service.name}
              </span>
              {service.muted && (
                <VolumeX className="w-3 h-3 text-muted-foreground" />
              )}
              {service.hibernated && (
                <Moon className="w-3 h-3 text-muted-foreground" />
              )}
              {service.unreadCount && service.unreadCount > 0 && (
                <Badge variant="destructive" className={`w-5 h-5 shrink-0 text-[10px]`}>
                  {service.unreadCount > 99 ? '99+' : service.unreadCount}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      <div className="h-1 bg-border my-3" />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onAddService}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold border border-input transition-colors whitespace-nowrap shrink-0"
              size="sm"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Service</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add a new web service</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="mt-auto border-t border-border pt-3 pb-2">
        <div className="flex flex-col gap-2 px-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onOpenProxyManager}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold border border-input transition-colors whitespace-nowrap shrink-0 hover:bg-secondary hover:text-foreground"
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Proxy & SSH</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Proxy & SSH Tunnels</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onOpenSettings}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold border border-input transition-colors whitespace-nowrap shrink-0 hover:bg-secondary hover:text-foreground"
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>Settings</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div
        className="absolute top-0 bottom-0 w-2 cursor-ew-resize z-10 bg-transparent"
        style={{ right: 0 }}
        onMouseDown={onResizeStart}
      />
    </aside>
  );
}
