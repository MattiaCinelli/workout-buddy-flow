import { useState } from 'react';
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
import { rescheduleAllReminders } from '@/lib/notifications';
import { getNotificationSettings, setNotificationSettings, LEAD_MINUTE_OPTIONS } from '@/lib/notificationSettings';

const leadLabel = (minutes: number) => minutes === 0 ? 'At the scheduled time' : `${minutes} minutes before`;

// Reads what's actually registered with the OS (LocalNotifications.getPending())
// rather than re-deriving "what should be scheduled" from calendar data — the
// two can drift (a stale reminder from before a schedule was edited, a
// permission that got revoked), so this shows ground truth, not an assumption.
export function RemindersButton() {
  const { scheduledWorkouts, getWorkoutById } = useData();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('reminders');
  const [pending, setPending] = useState<PendingLocalNotificationSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(getNotificationSettings);
  const [applyingSettings, setApplyingSettings] = useState(false);
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

  const handleOpen = () => {
    setOpen(true);
    setSettings(getNotificationSettings());
    if (isNative) void load();
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

  // Already-scheduled alarms were computed under the OLD settings, so
  // changing enabled/leadMinutes has to re-derive every reminder from the
  // calendar — the OS won't do that on its own.
  const applySettings = async (next: typeof settings) => {
    setSettings(next);
    setNotificationSettings(next);
    setApplyingSettings(true);
    try {
      await rescheduleAllReminders(scheduledWorkouts, workoutId => getWorkoutById(workoutId)?.title);
      await load();
      toast.success('Notification settings updated');
    } catch (error) {
      console.error('Failed to reschedule reminders:', error);
      toast.error('Settings saved, but reminders could not be rescheduled.');
    } finally {
      setApplyingSettings(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="icon" onClick={handleOpen} aria-label="Upcoming reminders">
        <Bell className="h-5 w-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
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

              <TabsContent value="settings" className="pt-2 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="reminders-enabled">Workout reminders</Label>
                    <p className="text-sm text-muted-foreground">Get notified before workouts you've scheduled on the calendar.</p>
                  </div>
                  <Switch
                    id="reminders-enabled"
                    checked={settings.enabled}
                    disabled={applyingSettings}
                    onCheckedChange={checked => void applySettings({ ...settings, enabled: checked })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reminders-lead">Remind me</Label>
                  <Select
                    value={String(settings.leadMinutes)}
                    disabled={!settings.enabled || applyingSettings}
                    onValueChange={value => void applySettings({ ...settings, leadMinutes: Number(value) })}
                  >
                    <SelectTrigger id="reminders-lead">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_MINUTE_OPTIONS.map(minutes => (
                        <SelectItem key={minutes} value={String(minutes)}>{leadLabel(minutes)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Applies to every workout you schedule, not just new ones.</p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
