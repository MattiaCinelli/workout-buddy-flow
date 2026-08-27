import { useState } from 'react';
import { Loader2, RefreshCw, RotateCcw, Server, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getLastSyncedAt,
  getLoggedInEmail,
  getServerUrl,
  getSyncStatus,
  isConnected,
  login,
  logout,
  resetSyncState,
  syncAll,
} from '@/lib/syncClient';
import { SyncConflicts } from '@/components/SyncConflicts';
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

  const isInsecureUrl = (url: string) => {
    const trimmed = url.trim().toLowerCase();
    return trimmed.startsWith('http://')
      && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(trimmed);
  };
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(getLastSyncedAt());
  const [status, setStatus] = useState(getSyncStatus());

  const refreshAll = () => Promise.all([
    refreshExercises(), refreshWorkouts(), refreshScheduledWorkouts(), refreshCourses(), refreshSessions(),
    refreshMuscleGroups(), refreshBodyMetrics(),
  ]);

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

  const runSync = async (label: string) => {
    setSyncing(true);
    setError(null);
    try {
      await syncAll();
      await refreshAll();
      setLastSyncedAt(getLastSyncedAt());
      toast.success(label);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setStatus(getSyncStatus());
      setSyncing(false);
    }
  };

  const handleSyncNow = () => runSync('Sync complete');

  const handleFullResync = () => {
    resetSyncState();
    return runSync('Full re-sync complete');
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
          {isInsecureUrl(serverUrl) && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              This is an unencrypted <code>http://</code> address — your login token and workout data
              would be sent in the clear. Use <code>https://</code> unless the server is only reachable
              on a network you trust.
            </p>
          )}
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
          {isInsecureUrl(getServerUrl() ?? '') && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Unencrypted connection (http://).</p>
          )}
          <p className="break-all text-sm text-muted-foreground">{getLoggedInEmail()}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {lastSyncedAt
          ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
          : 'No completed sync recorded on this device yet.'}
      </p>
      {status.lastError && (!status.lastOkAt || (status.lastErrorAt ?? '') > status.lastOkAt) && (
        <p role="alert" className="text-sm text-destructive">
          Last sync failed: {status.lastError}
          {status.lastErrorAt && ` (${new Date(status.lastErrorAt).toLocaleString()})`}
        </p>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <SyncConflicts />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button onClick={handleSyncNow} disabled={syncing}>
          {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
        <Button variant="outline" onClick={handleFullResync} disabled={syncing}>
          <RotateCcw className="mr-2 h-4 w-4" />Full re-sync
        </Button>
        <Button variant="outline" onClick={handleDisconnect} disabled={syncing}>
          <Unplug className="mr-2 h-4 w-4" />Disconnect
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Automatic sync runs when the app opens and every 30 seconds while connected. Full re-sync re-pulls
        everything from the server — use it if data looks out of step.
      </p>
    </div>
  );
}
