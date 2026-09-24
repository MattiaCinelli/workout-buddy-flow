import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, Dumbbell, Image, ListChecks, ShieldCheck, TrendingUp } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const SEEN_KEY = 'workout-buddy-onboarded';

const STEPS = [
  { icon: Dumbbell, title: 'Exercises', text: '75 are built in, each with how-to notes — add your own any time, photos included.' },
  { icon: ListChecks, title: 'Workouts', text: 'Starter workouts are ready to run, from full-body strength to mobility. Build your own from sets of reps or timed holds.' },
  { icon: CalendarDays, title: 'Plan it', text: 'Put workouts on the calendar, or follow a starter course: “Strength & Stretch Starter” (4 weeks) or “Zero to Wet Noodle” (6 weeks of flexibility).' },
  { icon: TrendingUp, title: 'Run & review', text: 'Full-screen guided mode counts you through — in the Android app you can say “next” to move on hands-free. History, per-exercise trends and records build up as you go.' },
  { icon: ShieldCheck, title: 'Your data', text: 'Changes save locally first. The phone app keeps a recovery snapshot; portable encrypted backups and optional self-hosted sync are available in Settings.' },
  { icon: Bell, title: 'Reminders', text: 'Notification permission is optional. If enabled, reminders can start, snooze, or skip a scheduled workout.' },
  { icon: Image, title: 'Exercise pictures', text: 'Pictures stay on your device or behind your authenticated sync account and are included in new portable backups.' },
];

// A one-time welcome on first launch. Everything it mentions already exists
// in the seeded data, so it is orientation, not setup.
export function OnboardingDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch { /* storage disabled — just skip the intro */ }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) dismiss(); }}>
      {/* Fits the screen: the list takes the remaining height and scrolls,
          so the heading and the buttons are always visible. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto_auto] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Workout Buddy</DialogTitle>
          <DialogDescription>
            Everything runs on your device — no account, works offline. Here's the shape of it.
          </DialogDescription>
        </DialogHeader>

        <ul className="min-h-0 space-y-3 overflow-y-auto pr-1">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted-foreground">
          Not medical advice — consult a doctor before starting a new exercise programme, and stop if
          anything hurts.
        </p>

        {/* Stacked at every width: three side-by-side buttons are wider than
            the dialog. The footer is column-reverse, so the primary action
            (last) sits on top. */}
        <DialogFooter className="gap-2 sm:flex-col-reverse sm:justify-start sm:space-x-0">
          <Button variant="outline" onClick={dismiss}>Explore on my own</Button>
          <Button variant="outline" onClick={() => { dismiss(); navigate('/settings#data'); }}>Review data safety</Button>
          <Button onClick={() => { dismiss(); navigate('/courses'); }}>See the starter courses</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
