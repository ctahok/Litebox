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
      {/* Proxy Status Pill at top of rail */}
      <div className="px-2 pt-3 pb-2">
        <ProxyStatusPill
          status={{ mode: 'DIRECT', activeProfileId: null, activeProfileName: null, type: null, localSocksAddress: null, tunnelState: 'idle', error: null }}
          onToggle={() => {}}
          onOpenManager={onOpenProxyManager}
        />
      </div>

      {/* Service list (scrollable) */}
      <div className="flex-1 overflow-y-auto p-3 gap-2">
        {services.map((service) => {
          const isActive = activeServiceId === service.id;
          const Icon = PRESET_ICONS[service.preset] ?? Globe;
          return (
            <div
              key={service.id}
              onClick={() => handleServiceClick(service.id)}
              className={`relative group cursor-pointer rounded-md p-2 transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground border-r-2 border-primary'
                  : 'hover:bg-secondary'
              }`}
            >
              {/* Active bar */}
              {isActive && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary" />
              )}
              <div className="flex items-center justify-center h-8 w-6 relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary bg-primary/20' : 'text-muted-foreground group-hover:text-foreground'}`} />
                {service.muted && (
                  <VolumeX className="absolute bottom-0 left-0 w-3 h-3 text-muted-foreground" />
                )}
                {service.hibernated && (
                  <Moon className="absolute bottom-0 right-0 w-3 h-3 text-muted-foreground" />
                )}
                {service.unreadCount && service.unreadCount > 0 && (
                  <Badge variant="destructive" className={`absolute top-0 right-0 ${
                    service.unreadCount > 99 ? 'w-5 h-5' : 'w-3 h-3'
                  } ${service.unreadCount > 99 ? 'text-[10px]' : ''}`}>
                    {service.unreadCount > 99 ? '99+' : service.unreadCount}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-1 bg-border my-3" />

      {/* Add Service button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onAddService}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium border border-input transition-colors whitespace-nowrap shrink-0"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add a new web service</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="mt-auto border-t border-border pt-3 pb-2">
        {/* Bottom pinned buttons */}
        <div className="flex items-center justify-between px-3 gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onOpenProxyManager}
                  className="h-8 w-8 p-0 rounded-md hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors"
                  size="icon"
                  aria-label="Proxy & SSH Tunnels"
                >
                  <Shield className="w-4 h-4" />
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
                  className="h-8 w-8 p-0 rounded-md hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors"
                  size="icon"
                  aria-label="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="absolute top-0 bottom-0 w-2 cursor-ew-resize z-10 bg-transparent"
        style={{ right: 0 }}
        onMouseDown={onResizeStart}
      />
    </aside>
  );
}