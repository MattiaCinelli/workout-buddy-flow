import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import {
  getDisplayName, getLoggedInEmail, updateDisplayName, updateEmail, changePassword,
  getOtherDeviceCount, revokeOtherSessions, deleteAccount,
} from '@/lib/syncClient';
import { toast } from 'sonner';

const MIN_PASSWORD_LENGTH = 8;

interface AccountProfileTabProps {
  // Called after the account is deleted, so the surrounding page can drop
  // back to the disconnected view.
  onDisconnected?: () => void;
}

// Independent mini-forms (display name, email, password), each with its own
// save button and error state — email/password changes require re-entering
// the current password (server-enforced, not just a client nicety:
// server/src/http/routes/account.ts rejects these without it), display name
// doesn't since it's purely cosmetic. Below them: device-session control
// and an irreversible delete-account action.
export function AccountProfileTab({ onDisconnected }: AccountProfileTabProps) {
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

  const [otherDevices, setOtherDevices] = useState<number | null>(null);
  const [revoking, setRevoking] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    // Best-effort — a stale count just means the button still shows; the
    // revoke call itself is harmless when there's nothing to revoke.
    getOtherDeviceCount().then(setOtherDevices).catch(() => setOtherDevices(null));
  }, []);

  const handleRevokeOthers = async () => {
    setRevoking(true);
    try {
      await revokeOtherSessions();
      setOtherDevices(0);
      toast.success('Other devices signed out. They will need to reconnect.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sign out other devices');
    } finally {
      setRevoking(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      setDeleteOpen(false);
      setDeletePassword('');
      toast.success('Account deleted. This device is now offline-only; your data stays on it.');
      onDisconnected?.();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete account');
    } finally {
      setDeleting(false);
    }
  };

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

      <div className="space-y-2 border-t pt-4">
        <Label>Other devices</Label>
        <p className="text-sm text-muted-foreground">
          {otherDevices === null
            ? 'Signed in on this device.'
            : otherDevices === 0
              ? 'No other devices are signed in.'
              : `Signed in on ${otherDevices} other device${otherDevices === 1 ? '' : 's'}.`}
        </p>
        <p className="text-xs text-muted-foreground">
          Sign out every device except this one — for a lost or shared device. They keep their local
          data and can reconnect with your password.
        </p>
        <Button
          variant="outline"
          onClick={handleRevokeOthers}
          disabled={revoking || otherDevices === 0}
          className="w-full"
        >
          {revoking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {revoking ? 'Signing out…' : 'Sign out other devices'}
        </Button>
      </div>

      <div className="space-y-2 rounded-lg border border-destructive/40 p-4">
        <Label className="text-destructive">Delete account</Label>
        <p className="text-xs text-muted-foreground">
          Permanently deletes your account and everything synced to the server. It does not touch the
          data on this device — the app keeps working offline. Other devices drop to offline mode too.
          This cannot be undone.
        </p>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)} className="w-full">
          Delete account
        </Button>
      </div>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={open => { if (!open && !deleting) { setDeleteOpen(false); setDeletePassword(''); setDeleteError(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your account and all server-side data will be permanently removed. The workouts, exercises
              and history on this device stay put and the app keeps working offline. Enter your password
              to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={e => setDeletePassword(e.target.value)}
            disabled={deleting}
            placeholder="Current password"
          />
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={event => { event.preventDefault(); void handleDeleteAccount(); }}
              disabled={deleting || !deletePassword}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
