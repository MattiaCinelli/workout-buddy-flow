import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isConnected } from '@/lib/syncClient';
import { useNavigate } from 'react-router-dom';

// The one canonical, always-visible entry point into account/sync — sits
// in the navbar next to ThemeToggle rather than buried in a per-page
// settings menu, so "am I connected" is visible from anywhere in the app,
// not just when Progress's dropdown happens to be open.
export function AccountButton() {
  const navigate = useNavigate();
  const connected = isConnected();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate('/settings#account')}
      aria-label={connected ? 'Account settings — connected to sync' : 'Account settings — not connected'}
    >
      <User className="h-5 w-5" fill={connected ? 'currentColor' : 'none'} />
    </Button>
  );
}
