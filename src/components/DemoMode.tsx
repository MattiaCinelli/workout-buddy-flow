import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { enterDemoMode, exitDemoMode, isDemoMode } from '@/lib/demoMode';

/** A slim reminder, on every screen except the full-screen guided workout, that the guest profile is showing.
 * Shown as "Guest profile" rather than "demo": the app is complete, and this is simply another profile. */
export const DemoModeBanner = () => {
  const { pathname } = useLocation();
  if (!isDemoMode() || /\/(session|start|try)$/.test(pathname)) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-3 border-b border-primary/30 bg-primary/10 px-4 py-1.5 text-sm">
      <span className="flex items-center gap-2"><UsersRound className="h-4 w-4" aria-hidden="true" />Guest profile</span>
      <Button size="sm" variant="outline" className="h-7" onClick={exitDemoMode}>Back to my profile</Button>
    </div>
  );
};

export const DemoModeCard = () => {
  const demo = isDemoMode();
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <Card id="guest-profile">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UsersRound className="h-5 w-5" />Guest profile</CardTitle>
        <CardDescription>
          {demo
            ? 'You are using the guest profile. Your own workouts, pictures and history are private and untouched.'
            : 'Show the app to someone using a guest profile with sample exercises and workouts. Your own data stays private and untouched.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {demo ? (
          <>
            <p className="text-sm text-muted-foreground">
              Changes made in the guest profile are reset the next time you switch to it. Sync, backups and reminders are paused until you switch back.
            </p>
            <Button onClick={exitDemoMode}>Back to my profile</Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>Switch to guest profile</Button>
        )}
      </CardContent>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to the guest profile?</AlertDialogTitle>
            <AlertDialogDescription>
              The app reloads with illustrated sample exercises, workouts and training history. Your own data stays on this
              device, untouched, and comes back when you tap “Back to my profile”. Sync, backups and reminders pause meanwhile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void enterDemoMode()}>Switch</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
