import { useState } from 'react';
import { Loader2, RefreshCw, Server, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getLastSyncedAt,
  getLoggedInEmail,
  getServerUrl,
  isConnected,
  login,
  logout,
  syncAll,
} from '@/lib/syncClient';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';

interface SyncSettingsPanelProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function SyncSettingsPanel({ onConnectionChange }: SyncSettingsPanelProps) {
  const {
    refreshExercises, refreshWorkouts, refreshScheduledWorkouts, refreshCourses, refreshSessions,
    refreshMuscleGroups, refreshBodyMetrics,
  } = useData();
  const [connected, setConnected] = useState(isConnected());
  const [serverUrl, setServerUrl] = useState(getServerUrl() ?? 'http://');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(getLastSyncedAt());

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await login(serverUrl, email, password);
      setConnected(true);
      setPassword('');
      onConnectionChange?.(true);
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
    onConnectionChange?.(false);
    toast.success('Disconnected from sync server');
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncAll();
      await Promise.all([
        refreshExercises(), refreshWorkouts(), refreshScheduledWorkouts(), refreshCourses(), refreshSessions(),
        refreshMuscleGroups(), refreshBodyMetrics(),
      ]);
      setLastSyncedAt(getLastSyncedAt());
      toast.success('Sync complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (!connected) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          Sync is optional. Your data remains on this device until you connect to your own server.
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sync-server-url">Server URL</Label>
          <Input
            id="sync-server-url"
            inputMode="url"
            placeholder="http://192.168.1.23:3000"
            value={serverUrl}
            onChange={event => setServerUrl(event.target.value)}
            disabled={connecting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sync-email">Email</Label>
          <Input id="sync-email" type="email" autoComplete="email" value={email}
            onChange={event => setEmail(event.target.value)} disabled={connecting} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sync-password">Password</Label>
          <Input id="sync-password" type="password" autoComplete="current-password" value={password}
            onChange={event => setPassword(event.target.value)} disabled={connecting}
            onKeyDown={event => { if (event.key === 'Enter') void handleConnect(); }} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleConnect} disabled={connecting || !serverUrl || !email || !password} className="w-full sm:w-auto">
          {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />}
          {connecting ? 'Connecting…' : 'Connect server'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-medium">Connected</p>
          <p className="break-all text-sm text-muted-foreground">{getServerUrl()}</p>
          <p className="break-all text-sm text-muted-foreground">{getLoggedInEmail()}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {lastSyncedAt
          ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
          : 'No completed sync recorded on this device yet.'}
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={handleSyncNow} disabled={syncing}>
          {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
        <Button variant="outline" onClick={handleDisconnect} disabled={syncing}>
          <Unplug className="mr-2 h-4 w-4" />Disconnect
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Automatic sync runs when the app opens and every 30 seconds while connected.</p>
    </div>
  );
}
