import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { enterDemoMode, exitDemoMode, isDemoMode } from '@/lib/demoMode';

/** A slim reminder, on every screen except the full-screen guided workout, that sample data is showing. */
export const DemoModeBanner = () => {
  const { pathname } = useLocation();
  if (!isDemoMode() || /\/(session|start|try)$/.test(pathname)) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-3 border-b border-primary/30 bg-primary/10 px-4 py-1.5 text-sm">
      <span className="flex items-center gap-2"><Presentation className="h-4 w-4" aria-hidden="true" />Demo mode: sample data</span>
      <Button size="sm" variant="outline" className="h-7" onClick={exitDemoMode}>Exit demo</Button>
    </div>
  );
};

export const DemoModeCard = () => {
  const demo = isDemoMode();
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <Card id="demo">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Presentation className="h-5 w-5" />Demo mode</CardTitle>
        <CardDescription>
          {demo
            ? 'You are looking at sample data. Your own workouts, pictures and history are hidden and unchanged.'
            : 'Show the app to someone else using sample exercises and workouts instead of your own data.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {demo ? (
          <>
            <p className="text-sm text-muted-foreground">
              Anything you change during the demo is thrown away the next time you start one. Sync, backups and reminders are paused until you exit.
            </p>
            <Button onClick={exitDemoMode}>Exit demo mode</Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>Start demo mode</Button>
        )}
      </CardContent>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start demo mode?</AlertDialogTitle>
            <AlertDialogDescription>
              The app reloads with a few cartoon exercises, sample workouts and a made-up history. Your real data stays
              on this device, untouched, and comes back when you tap “Exit demo”. Sync, backups and reminders pause during the demo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void enterDemoMode()}>Start demo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
