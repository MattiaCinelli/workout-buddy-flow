import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Dumbbell, ListChecks, TrendingUp } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const SEEN_KEY = 'workout-buddy-onboarded';

const STEPS = [
  { icon: Dumbbell, title: 'Exercises', text: '38 are built in with form notes and diagrams — add your own any time, photos included.' },
  { icon: ListChecks, title: 'Workouts', text: 'Three starter workouts are ready to run. Build your own from sets of reps or timed holds.' },
  { icon: CalendarDays, title: 'Plan it', text: 'Put workouts on the calendar, or follow the “Strength & Stretch Starter” course over four weeks.' },
  { icon: TrendingUp, title: 'Run & review', text: 'Full-screen guided mode counts you through. History, per-exercise trends and streaks build up as you go.' },
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Workout Buddy</DialogTitle>
          <DialogDescription>
            Everything runs on your device — no account, works offline. Here's the shape of it.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
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

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={dismiss}>Explore on my own</Button>
          <Button onClick={() => { dismiss(); navigate('/courses'); }}>See the starter course</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
