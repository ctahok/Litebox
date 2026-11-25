import { useState } from 'react';
import type { ProxyProfile, SshHostConfig } from '@shared/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/renderer/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/renderer/components/ui/tabs';
import { Switch } from '@/renderer/components/ui/switch';
import { Badge } from '@/renderer/components/ui/badge';
import { Input } from '@/renderer/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/renderer/components/ui/select';
import { Label } from '@/renderer/components/ui/label';
import { Separator } from '@/renderer/components/ui/separator';
import { Button } from '@/renderer/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/renderer/components/ui/tooltip';
import { Shield, Plus, Copy, Edit, Delete, RefreshCw } from 'lucide-react';
import { Card } from '@/renderer/components/ui/card';

interface ProxyManagerModalProps {
  open: boolean;
  onClose: () => void;
  onSetOverlayOpen: (open: boolean) => void;
}

const MOCK_PROFILES: ProxyProfile[] = [
  {
    id: 'profile-1',
    name: 'Frankfurt SOCKS5',
    type: 'standard',
    protocol: 'socks5',
    host: 'proxy.example.com',
    port: 1080,
    username: 'user1',
    encryptedPasswordB64: null,
    requiresReauth: false,
  },
  {
    id: 'profile-2',
    name: 'My VPS Tunnel',
    type: 'ssh_tunnel',
    sshHostId: 'ssh-1',
    localSocksHost: '127.0.0.1',
    localSocksPort: 10808,
    autoReconnect: true,
  },
];

const MOCK_SSH_HOSTS: SshHostConfig[] = [
  {
    id: 'ssh-1',
    name: 'Hetzner Frankfurt VPS',
    host: '203.0.113.10',
    port: 22,
    username: 'tunneluser',
    authType: 'privateKey',
    encryptedPasswordB64: null,
    keySource: 'inline',
    encryptedPrivateKeyB64: null,
    privateKeyPath: null,
    encryptedPassphraseB64: null,
    jumpHostId: null,
    knownHostFingerprint: 'SHA256:abcdef123456...',
    keepaliveIntervalSec: 15,
    requiresReauth: false,
  },
];

export function ProxyManagerModal({
  open,
  onClose,
  onSetOverlayOpen,
}: ProxyManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'proxy-profiles' | 'ssh-hosts'>('proxy-profiles');
  const [isAddingProfile, setIsAddingProfile] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'proxy-profiles' | 'ssh-hosts');
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
      <DialogContent className="sm:max-w-[768px]">
        <DialogHeader>
          <DialogTitle>Proxy & SSH Tunnels</DialogTitle>
          <DialogDescription>
            Manage proxy profiles and SSH tunnel hosts
          </DialogDescription>
        </DialogHeader>
        <Separator className="my-4" />
        <div className="flex flex-col h-full">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="border-b border-border"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="proxy-profiles"
                onClick={() => setActiveTab('proxy-profiles')}
                className="h-9 px-4 text-sm font-medium transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Proxy Profiles
              </TabsTrigger>
              <TabsTrigger
                value="ssh-hosts"
                onClick={() => setActiveTab('ssh-hosts')}
                className="h-9 px-4 text-sm font-medium transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                SSH Hosts
              </TabsTrigger>
            </TabsList>
            <TabsContent value="proxy-profiles" className="overflow-y-auto max-h-[70vh] p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 px-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={false} onCheckedChange={() => {}} className="h-8" />
                    <Label className="text-sm font-medium">Global Proxy</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs px-2 py-1">Remote DNS: ON</Badge>
                    <Badge variant="secondary" className="text-xs px-2 py-1">Kill Switch: ON</Badge>
                    <Badge variant="secondary" className="text-xs px-2 py-1">WebRTC UDP Block: ON</Badge>
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Label className="text-sm font-medium">Profiles</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setIsAddingProfile(true)}
                          className="h-8 w-8 p-0"
                          size="icon"
                          aria-label="Add Profile"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add Profile</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {MOCK_PROFILES.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-4 px-3 py-2 rounded-md border border-border hover:bg-muted transition-colors"
                  >
                    <Switch checked={profile.id === 'profile-1'} onCheckedChange={() => {}} className="h-8 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium whitespace-nowrap truncate">{profile.name}</span>
                        <Badge variant="outline" className="text-xs px-2 py-1">
                          {profile.type === 'standard' ? profile.protocol.toUpperCase() : 'SSH TUNNEL'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground whitespace-nowrap truncate">
                          {profile.type === 'standard' ? `${profile.host}:${profile.port}` : '127.0.0.1:10808'}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs px-2 py-1">Ready</Badge>
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button className="h-8 w-8 p-0" size="icon" aria-label="Edit profile">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button className="h-8 w-8 p-0" size="icon" aria-label="Delete profile">
                              <Delete className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => { navigator.clipboard.writeText('127.0.0.1:10808'); }}
                              className="h-8 w-8 p-0" size="icon" aria-label="Copy address"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy address</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
                {isAddingProfile && (
                  <Card className="p-4">
                    <DialogHeader>
                      <DialogTitle>Add Proxy Profile</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={() => setIsAddingProfile(false)} className="h-9 whitespace-nowrap shrink-0">
                        Cancel
                      </Button>
                      <Button className="h-9 whitespace-nowrap shrink-0">Save</Button>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>
            <TabsContent value="ssh-hosts" className="overflow-y-auto max-h-[70vh] p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Label className="text-sm font-medium">SSH Hosts</Label>
                  <Button onClick={() => {}} className="h-9 whitespace-nowrap shrink-0">
                    + Add SSH Host
                  </Button>
                </div>
                {MOCK_SSH_HOSTS.map((host) => (
                  <div
                    key={host.id}
                    className="flex items-center gap-4 px-3 py-2 rounded-md border border-border hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium whitespace-nowrap truncate">{host.name}</span>
                        <Badge variant="outline" className="text-xs px-2 py-1">{host.authType}</Badge>
                        {host.jumpHostId && (
                          <Badge variant="secondary" className="text-xs px-2 py-1">Jump</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground whitespace-nowrap truncate">
                          {host.username}@{host.host}:{host.port}
                        </span>
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          {host.knownHostFingerprint?.replace('SHA256:', '')?.substring(0, 16)}…
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button className="h-8 w-8 p-0" size="icon" aria-label="Edit host">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button className="h-8 w-8 p-0" size="icon" aria-label="Delete host">
                              <Delete className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button className="h-8 w-8 p-0" size="icon" aria-label="Reset host key">
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reset known host key</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
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