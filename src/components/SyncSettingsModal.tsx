import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { getLastSyncedAt, getLoggedInEmail, getServerUrl, isConnected, login, logout, syncAll } from '@/lib/syncClient';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';

interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({ isOpen, onClose }) => {
  const { refreshExercises, refreshWorkouts, refreshScheduledWorkouts, refreshCourses, refreshSessions } = useData();
  const [connected, setConnected] = useState(isConnected());
  const [serverUrl, setServerUrl] = useState(getServerUrl() ?? 'http://');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Seeded from the persisted value (set by any sync, including a
  // background one via useAutoSync) rather than starting blank, so
  // reopening this dialog reflects reality even if this component instance
  // never itself ran a sync. Not live-updated while open — a background
  // sync mid-session won't refresh this line until the dialog is reopened,
  // which is an acceptable gap given the 30s interval.
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(getLastSyncedAt());

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await login(serverUrl, email, password);
      setConnected(true);
      setPassword('');
      toast.success('Connected to sync server');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await logout();
    setConnected(false);
    setLastSyncedAt(null);
    toast.success('Disconnected from sync server');
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncAll();
      await Promise.all([
        refreshExercises(), refreshWorkouts(), refreshScheduledWorkouts(), refreshCourses(), refreshSessions(),
      ]);
      setLastSyncedAt(getLastSyncedAt());
      toast.success('Sync complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Self-hosted sync</DialogTitle>
          <DialogDescription>
            {connected
              ? 'Connected. Syncs automatically in the background every 30 seconds and whenever you open the app — Sync now is only for forcing it immediately.'
              : 'Connect to your own self-hosted sync server to use this library across your devices. This is optional — everything still works fully offline without it.'}
          </DialogDescription>
        </DialogHeader>

        {connected ? (
          <div className="space-y-4">
            <div className="text-sm">
              <p><span className="text-muted-foreground">Server:</span> {getServerUrl()}</p>
              <p><span className="text-muted-foreground">Account:</span> {getLoggedInEmail()}</p>
            </div>
            {lastSyncedAt && (
              <p className="text-sm text-muted-foreground">Last synced: {new Date(lastSyncedAt).toLocaleTimeString()}</p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleSyncNow} disabled={syncing} className="flex-1">
                {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {syncing ? 'Syncing…' : 'Sync now'}
              </Button>
              <Button variant="outline" onClick={handleDisconnect} disabled={syncing}>Disconnect</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="sync-server-url">Server URL</Label>
              <Input id="sync-server-url" placeholder="http://192.168.1.23:3000" value={serverUrl}
                onChange={e => setServerUrl(e.target.value)} disabled={connecting} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sync-email">Email</Label>
              <Input id="sync-email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={connecting} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sync-password">Password</Label>
              <Input id="sync-password" type="password" value={password}
                onChange={e => setPassword(e.target.value)} disabled={connecting}
                onKeyDown={e => { if (e.key === 'Enter') void handleConnect(); }} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {!connected && (
          <DialogFooter>
            <Button onClick={handleConnect} disabled={connecting || !serverUrl || !email || !password}>
              {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {connecting ? 'Connecting…' : 'Connect'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SyncSettingsModal;
