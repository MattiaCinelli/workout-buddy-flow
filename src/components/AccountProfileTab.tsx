import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { getDisplayName, getLoggedInEmail, updateDisplayName, updateEmail, changePassword } from '@/lib/syncClient';
import { toast } from 'sonner';

const MIN_PASSWORD_LENGTH = 8;

// Three independent mini-forms (display name, email, password), each with
// its own save button and error state — email/password changes require
// re-entering the current password (server-enforced, not just a client
// nicety: server/src/http/routes/account.ts rejects these without it),
// display name doesn't since it's purely cosmetic.
export function AccountProfileTab() {
  const [displayName, setDisplayName] = useState(getDisplayName() ?? '');
  const [savingName, setSavingName] = useState(false);

  const [email, setEmail] = useState(getLoggedInEmail() ?? '');
  const [emailPassword, setEmailPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSaveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      await updateDisplayName(trimmed);
      toast.success('Display name updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update display name');
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveEmail = async () => {
    setEmailError(null);
    setSavingEmail(true);
    try {
      await updateEmail(emailPassword, email.trim());
      setEmailPassword('');
      toast.success('Email updated');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Could not update email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed. Other devices have been signed out and will need to reconnect.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="account-display-name">Display name</Label>
        <div className="flex gap-2">
          <Input
            id="account-display-name" value={displayName} onChange={e => setDisplayName(e.target.value)}
            disabled={savingName} placeholder="Shown instead of your email"
          />
          <Button onClick={handleSaveName} disabled={savingName || !displayName.trim()}>
            {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label htmlFor="account-email">Email</Label>
        <Input id="account-email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={savingEmail} />
        <Input
          type="password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)}
          disabled={savingEmail} placeholder="Current password, to confirm"
        />
        {emailError && <p className="text-sm text-destructive">{emailError}</p>}
        <Button onClick={handleSaveEmail} disabled={savingEmail || !email.trim() || !emailPassword} className="w-full">
          {savingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {savingEmail ? 'Saving…' : 'Update email'}
        </Button>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label htmlFor="account-current-password">Change password</Label>
        <Input
          id="account-current-password" type="password" value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)} disabled={savingPassword} placeholder="Current password"
        />
        <Input
          type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
          disabled={savingPassword} placeholder="New password"
        />
        <Input
          type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
          disabled={savingPassword} placeholder="Confirm new password"
        />
        {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
        <p className="text-xs text-muted-foreground">
          Changing your password signs out your other devices — they'll need to reconnect with the new password.
        </p>
        <Button
          onClick={handleChangePassword}
          disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
          className="w-full"
        >
          {savingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {savingPassword ? 'Changing…' : 'Change password'}
        </Button>
      </div>
    </div>
  );
}
