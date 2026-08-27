import { useId, useState } from 'react';
import { Bell } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, PendingLocalNotificationSchema } from '@capacitor/local-notifications';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useData } from '@/contexts/DataContext';
import NotificationDiagnostics from '@/components/NotificationDiagnostics';
import { rescheduleAllReminders } from '@/lib/notifications';
import { getNotificationSettings, setNotificationSettings, LEAD_MINUTE_OPTIONS } from '@/lib/notificationSettings';

const leadLabel = (minutes: number) => minutes === 0 ? 'At the scheduled time' : `${minutes} minutes before`;

interface RemindersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReminderPreferencesProps {
  onApplied?: (settings: ReturnType<typeof getNotificationSettings>) => void | Promise<void>;
}

export function ReminderPreferences({ onApplied }: ReminderPreferencesProps) {
  const id = useId();
  const { scheduledWorkouts, getWorkoutById } = useData();
  const [settings, setSettings] = useState(getNotificationSettings);
  const [applyingSettings, setApplyingSettings] = useState(false);
  const [diagnosticsKey, setDiagnosticsKey] = useState(0);
  const isNative = Capacitor.isNativePlatform();

  const applySettings = async (next: typeof settings) => {
    setSettings(next);
    setNotificationSettings(next);
    setApplyingSettings(true);
    try {
      await rescheduleAllReminders(scheduledWorkouts, workoutId => getWorkoutById(workoutId)?.title);
      await onApplied?.(next);
      setDiagnosticsKey(key => key + 1);
      toast.success('Notification settings updated');
    } catch (error) {
      console.error('Failed to reschedule reminders:', error);
      toast.error('Settings saved, but reminders could not be rescheduled.');
    } finally {
      setApplyingSettings(false);
    }
  };

  return (
    <div className="space-y-5">
      {!isNative && (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          Workout notifications are delivered by the installed Android app, not by a browser tab.
        </p>
      )}
      <NotificationDiagnostics remindersEnabled={settings.enabled} refreshKey={diagnosticsKey} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor={`${id}-enabled`}>Workout reminders</Label>
          <p className="text-sm text-muted-foreground">Get notified before workouts scheduled on the calendar.</p>
        </div>
        <Switch
          id={`${id}-enabled`}
          checked={settings.enabled}
          disabled={applyingSettings || !isNative}
          onCheckedChange={checked => void applySettings({ ...settings, enabled: checked })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-lead`}>Remind me</Label>
        <Select
          value={String(settings.leadMinutes)}
          disabled={!settings.enabled || applyingSettings || !isNative}
          onValueChange={value => void applySettings({ ...settings, leadMinutes: Number(value) })}
        >
          <SelectTrigger id={`${id}-lead`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {LEAD_MINUTE_OPTIONS.map(minutes => (
              <SelectItem key={minutes} value={String(minutes)}>{leadLabel(minutes)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">This applies to existing and newly scheduled workouts.</p>
      </div>
    </div>
  );
}

// Fully controlled, and deliberately separate from whatever button opens
// it (see RemindersTriggerButton below). This dialog is meant to be
// mounted exactly ONCE, for the lifetime of the page — if it lived inside
// a conditionally-unmounted container (e.g. a mobile menu that closes
// itself the moment this opens), that container's unmount would tear this
// dialog down in the same instant it opened, since a React unmount also
// destroys anything the unmounting subtree rendered into a portal.
export function RemindersDialog({ open, onOpenChange }: RemindersDialogProps) {
  const [tab, setTab] = useState('reminders');
  const [pending, setPending] = useState<PendingLocalNotificationSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(getNotificationSettings);
  const isNative = Capacitor.isNativePlatform();

  const load = async () => {
    setLoading(true);
    try {
      const result = await LocalNotifications.getPending();
      setPending(
        [...result.notifications].sort((a, b) => (a.schedule?.at?.getTime() ?? 0) - (b.schedule?.at?.getTime() ?? 0))
      );
    } catch (error) {
      console.error('Failed to load pending reminders:', error);
      toast.error('Could not load reminders.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) {
      setSettings(getNotificationSettings());
      if (isNative) void load();
    }
  };

  const cancelOne = async (id: number) => {
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
      setPending(prev => prev.filter(item => item.id !== id));
      toast.success('Reminder cancelled');
    } catch (error) {
      console.error('Failed to cancel reminder:', error);
      toast.error('Could not cancel that reminder.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reminders</DialogTitle>
          <DialogDescription>
            {isNative
              ? 'Notifications scheduled on this device for your upcoming workouts.'
              : 'Reminders are scheduled through the installed app and only show up there — not in a browser tab.'}
          </DialogDescription>
        </DialogHeader>

        {!isNative ? null : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="reminders">Upcoming ({pending.length})</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="reminders" className="pt-2">
              {loading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
              ) : pending.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {settings.enabled
                    ? 'No reminders scheduled. Set a reminder time when scheduling a workout on the calendar.'
                    : 'Reminders are turned off — see the Settings tab to turn them back on.'}
                </p>
              ) : (
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                  {pending.map(item => (
                    <li key={item.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.body}</p>
                        {item.schedule?.at && (
                          <p className="text-sm text-muted-foreground">
                            {item.schedule.at.toLocaleString(undefined, {
                              weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => cancelOne(item.id)}>Cancel</Button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="settings" className="pt-2">
              <ReminderPreferences onApplied={next => { setSettings(next); return load(); }} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface RemindersTriggerButtonProps {
  variant?: 'icon' | 'menu-item';
  onClick: () => void;
}

// Just a button — no dialog, no state. Safe to render anywhere, including
// inside something that gets unmounted (a mobile drawer that closes
// itself on click), because it owns nothing that would be lost.
export function RemindersTriggerButton({ variant = 'icon', onClick }: RemindersTriggerButtonProps) {
  return variant === 'icon' ? (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label="Upcoming reminders">
      <Bell className="h-5 w-5" />
    </Button>
  ) : (
    <Button variant="outline" className="flex items-center gap-2 w-full justify-start" onClick={onClick}>
      <Bell className="h-4 w-4" />
      <span>Reminders</span>
    </Button>
  );
}
