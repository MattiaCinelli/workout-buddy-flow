import { useState } from 'react';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SyncSettingsModal from '@/components/SyncSettingsModal';
import { isConnected } from '@/lib/syncClient';

// The one canonical, always-visible entry point into account/sync — sits
// in the navbar next to ThemeToggle rather than buried in a per-page
// settings menu, so "am I connected" is visible from anywhere in the app,
// not just when Progress's dropdown happens to be open.
export function AccountButton() {
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(isConnected());

  const handleClose = () => {
    setOpen(false);
    // Re-check rather than assume: this dialog is where connect/disconnect
    // actually happen, so the indicator needs to reflect whatever the user
    // just did before closing it.
    setConnected(isConnected());
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={connected ? 'Account — connected to sync' : 'Account — not connected'}
      >
        <User className="h-5 w-5" fill={connected ? 'currentColor' : 'none'} />
      </Button>
      <SyncSettingsModal isOpen={open} onClose={handleClose} />
    </>
  );
}
