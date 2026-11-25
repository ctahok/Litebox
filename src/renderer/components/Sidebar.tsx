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

type LucideIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface SidebarProps {
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
    <aside className="fixed left-0 top-0 bottom-0 w-17 bg-gray-900 border-r border-white/10 flex flex-col z-20">
      {/* Service list (scrollable) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {services.map((service) => {
          const isActive = activeServiceId === service.id;
          const Icon = PRESET_ICONS[service.preset] ?? Globe;
          return (
            <div
              key={service.id}
              onClick={() => handleServiceClick(service.id)}
              className={`relative group cursor-pointer rounded-lg p-2 transition-colors ${
                isActive
                  ? 'bg-gray-800 border-r-2 border-blue-500'
                  : 'hover:bg-gray-800'
              }`}
            >
              {/* Active bar */}
              {isActive && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500" />
              )}
              <div className="flex items-center justify-center h-8 w-6 relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-200'}`} />
                {service.muted && (
                  <VolumeX className="absolute bottom-0 left-0 w-3 h-3 text-gray-400" />
                )}
                {service.hibernated && (
                  <Moon className="absolute bottom-0 right-0 w-3 h-3 text-gray-500" />
                )}
                {service.unreadCount && service.unreadCount > 0 && (
                  <span className={`absolute top-0 right-0 ${
                    service.unreadCount > 99 ? 'w-5 h-5' : 'w-3 h-3'
                  } rounded-full bg-red-500 text-xs text-white flex items-center justify-center ${
                    service.unreadCount > 99 ? 'text-[10px]' : ''
                  }`}>
                    {service.unreadCount > 99 ? '99+' : service.unreadCount}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-1 bg-gray-800/50 my-3" />

      {/* Add Service button */}
      <button
        onClick={onAddService}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors border border-white/10"
      >
        <Plus className="w-4 h-4" />
        <span>Add</span>
      </button>

      <div className="mt-auto border-t border-white/10 pt-3 pb-2">
        {/* Bottom pinned buttons */}
        <div className="flex items-center justify-between px-3 space-y-2">
          <button
            onClick={onOpenProxyManager}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            title="Proxy & SSH Tunnels"
          >
            <Shield className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}