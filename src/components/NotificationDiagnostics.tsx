import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  NotificationDiagnostics as Diagnostics, PermState, canDeliverReminders,
  getNotificationDiagnostics, openExactAlarmSettings, requestNotificationPermission,
} from '@/lib/notificationDiagnostics';

interface Props {
  /** Drives only the summary wording — "enabled but blocked" vs "blocked". */
  remindersEnabled?: boolean;
  /** Bump to force a re-read (e.g. after the parent re-schedules reminders). */
  refreshKey?: number;
}

const STATE_BADGE: Record<PermState, { label: string; className: string }> = {
  granted: { label: 'Granted', className: 'bg-green-500/15 text-green-600 dark:text-green-400 border-transparent' },
  denied: { label: 'Blocked', className: 'bg-destructive/15 text-destructive border-transparent' },
  prompt: { label: 'Not asked yet', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-transparent' },
  unsupported: { label: 'N/A', className: 'bg-muted text-muted-foreground border-transparent' },
};

const StatusRow = ({ label, hint, state, action }: {
  label: string; hint: string; state: PermState; action?: ReactNode;
}) => {
  const badge = STATE_BADGE[state];
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
};

// Shows the real OS-level delivery gates behind workout reminders, since the
// in-app switch alone doesn't guarantee Android will fire them. Native only.
const NotificationDiagnostics = ({ remindersEnabled, refreshKey = 0 }: Props) => {
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setDiagnostics(await getNotificationDiagnostics());
  }, []);

  useEffect(() => {
    void refresh();
    // Returning from the system exact-alarm screen (which can even restart
    // the app) or from Android settings should re-read the live state.
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh, refreshKey]);

  if (!diagnostics || !diagnostics.supported) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); await refresh(); }
    finally { setBusy(false); }
  };

  const ok = canDeliverReminders(diagnostics);
  const showExactAlarm = diagnostics.exactAlarm !== 'unsupported';

  return (
    <div className="space-y-2">
      <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
        ok ? 'border-green-500/30 bg-green-500/10' : 'border-amber-500/30 bg-amber-500/10'
      }`}>
        {ok
          ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
          : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />}
        <div className="flex-1">
          <p className="font-medium">
            {ok
              ? 'Android can deliver reminders'
              : remindersEnabled
                ? "Reminders are on, but Android won't deliver them yet"
                : 'Android would block reminders in their current state'}
          </p>
          {!ok && <p className="mt-0.5 text-xs text-muted-foreground">Fix the items below so scheduled reminders actually fire.</p>}
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void refresh()} disabled={busy}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" />Re-check
        </Button>
      </div>

      <StatusRow
        label="Android notifications"
        state={diagnostics.notifications}
        hint={
          diagnostics.notifications === 'granted' ? 'Workout Buddy is allowed to post notifications.'
            : diagnostics.notifications === 'denied' ? 'Turn notifications back on for Workout Buddy in Android Settings › Apps.'
              : 'Android has not been asked for notification permission yet.'
        }
        action={diagnostics.notifications !== 'granted' && (
          <Button type="button" size="sm" variant="outline" disabled={busy}
            onClick={() => void run(requestNotificationPermission)}>
            Allow notifications
          </Button>
        )}
      />

      {showExactAlarm && (
        <StatusRow
          label="Alarms & reminders (exact alarms)"
          state={diagnostics.exactAlarm}
          hint={
            diagnostics.exactAlarm === 'granted' ? 'Reminders can fire at the exact scheduled minute.'
              : 'Without this, Android may delay or drop reminders while the phone is idle.'
          }
          action={diagnostics.exactAlarm !== 'granted' && (
            <Button type="button" size="sm" variant="outline" disabled={busy}
              onClick={() => void run(openExactAlarmSettings)}>
              Open Android setting
            </Button>
          )}
        />
      )}

      {diagnostics.notifications === 'denied' && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          Once blocked, Android won't re-prompt — you'll need to change it in system settings.
        </p>
      )}
    </div>
  );
};

export default NotificationDiagnostics;
