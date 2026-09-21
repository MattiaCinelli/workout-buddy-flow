import { useEffect, useState } from 'react';
import { Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSyncStatus, isConnected, isSyncing, subscribeSyncActivity } from '@/lib/syncClient';
import { useNavigate } from 'react-router-dom';

// The one canonical, always-visible entry point into account/sync — sits
// in the navbar next to ThemeToggle rather than buried in a per-page
// settings menu, so "am I connected" is visible from anywhere in the app,
// not just when Progress's dropdown happens to be open. While a sync is
// actually running it swaps to a spinner, so the periodic background sync
// isn't completely invisible.
export function AccountButton() {
  const navigate = useNavigate();
  const connected = isConnected();
  const [syncing, setSyncing] = useState(isSyncing());
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());

  useEffect(() => subscribeSyncActivity(() => {
    setSyncing(isSyncing());
    setSyncStatus(getSyncStatus());
  }), []);

  const failed = connected && !!syncStatus.lastErrorAt
    && (!syncStatus.lastOkAt || syncStatus.lastErrorAt > syncStatus.lastOkAt);

  const label = syncing
    ? 'Account settings — syncing'
    : failed
      ? `Account settings — last sync failed: ${syncStatus.lastError}`
      : connected
        ? `Account settings — saved and synced${syncStatus.lastOkAt ? ` ${new Date(syncStatus.lastOkAt).toLocaleString()}` : ''}`
        : 'Account settings — data saved on this device; sync not connected';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate('/settings#account')}
      aria-label={label}
    >
      <span className="relative">
        {syncing
          ? <Loader2 className="h-5 w-5 animate-spin" />
          : <User className="h-5 w-5" fill={connected && !failed ? 'currentColor' : 'none'} />}
        {!syncing && (
          <span className={`absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-card ${
            failed ? 'bg-destructive' : connected ? 'bg-emerald-500' : 'bg-muted-foreground'
          }`} aria-hidden="true" />
        )}
      </span>
    </Button>
  );
}
