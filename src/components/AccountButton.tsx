import { useEffect, useState } from 'react';
import { Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isConnected, isSyncing, subscribeSyncActivity } from '@/lib/syncClient';
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

  useEffect(() => subscribeSyncActivity(() => setSyncing(isSyncing())), []);

  const label = syncing
    ? 'Account settings — syncing'
    : connected
      ? 'Account settings — connected to sync'
      : 'Account settings — not connected';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate('/settings#account')}
      aria-label={label}
    >
      {syncing
        ? <Loader2 className="h-5 w-5 animate-spin" />
        : <User className="h-5 w-5" fill={connected ? 'currentColor' : 'none'} />}
    </Button>
  );
}
