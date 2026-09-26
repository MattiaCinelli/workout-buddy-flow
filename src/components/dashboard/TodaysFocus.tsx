import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Clock, Dumbbell, Zap, Calendar, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/useData';
import { startOfToday } from 'date-fns';
import { scheduledWorkoutSessionUrl } from '@/lib/workoutSessionUrl';
import { isScheduledOccurrenceCompleted } from '@/lib/scheduleCompletion';
import { getAccessibilitySettings } from '@/lib/accessibilitySettings';
import { useMarkWorkoutDone } from '@/hooks/useMarkWorkoutDone';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type { ExpandedScheduledWorkout } from '@/lib/recurrence';

const HOLD_MS = 600;
// A finger drifting further than this is scrolling the page, not holding.
const HOLD_SLOP_PX = 10;

const TodaysFocus: React.FC = () => {
  const navigate = useNavigate();
  const { getScheduledWorkoutsForDate, getWorkoutById, sessions } = useData();
  const { markDone, savingKey } = useMarkWorkoutDone();
  const holdTimer = useRef<number | undefined>(undefined);
  const holdStart = useRef<{ x: number; y: number } | null>(null);
  // Set when a hold fires, so lifting the finger over "Start" does not also
  // open the workout that was just marked done.
  const suppressClick = useRef(false);
  const [holdingKey, setHoldingKey] = useState<string | null>(null);

  const cancelHold = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = undefined;
    holdStart.current = null;
    setHoldingKey(null);
  };
  useEffect(() => () => { if (holdTimer.current) window.clearTimeout(holdTimer.current); }, []);

  const holdHandlers = (scheduled: ExpandedScheduledWorkout, key: string, completed: boolean) => completed ? {} : {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      cancelHold();
      holdStart.current = { x: event.clientX, y: event.clientY };
      setHoldingKey(key);
      holdTimer.current = window.setTimeout(() => {
        holdTimer.current = undefined;
        holdStart.current = null;
        setHoldingKey(null);
        suppressClick.current = true;
        if (getAccessibilitySettings().haptics) Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
        void markDone(scheduled, key);
      }, HOLD_MS);
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      const start = holdStart.current;
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > HOLD_SLOP_PX) cancelHold();
    },
    onPointerUp: cancelHold,
    onPointerLeave: cancelHold,
    onPointerCancel: cancelHold,
    // Stop the phone's own long-press menu (text selection, "copy").
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    onClickCapture: (event: React.MouseEvent) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
  
  const today = startOfToday();
  const todaysWorkouts = getScheduledWorkoutsForDate(today).filter(schedule => !schedule.skipped);
  
  if (todaysWorkouts.length === 0) {
    return (
      <Card className="h-full border-dashed border-primary/20 bg-gradient-to-br from-card to-primary/[0.035]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Today's Focus
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-40 flex-col items-center justify-center pb-6 text-center">
          <div className="mb-3 rounded-xl bg-muted p-2.5">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="mb-1 font-semibold">Rest day</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            No workouts scheduled for today
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/calendar')}
          >
            Schedule a Workout
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-primary/20 bg-gradient-to-br from-card to-primary/[0.05]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Today's Focus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {todaysWorkouts.map((scheduled) => {
          const workout = getWorkoutById(scheduled.workoutId);
          if (!workout) return null;
          const completed = isScheduledOccurrenceCompleted(scheduled, sessions);
          const key = `${scheduled.id}-${scheduled.displayDate}`;
          
          return (
            <div 
              key={key}
              {...holdHandlers(scheduled, key, completed)}
              title={completed ? undefined : 'Hold to mark as done'}
              className={`flex select-none items-center justify-between gap-3 p-3 rounded-lg border shadow-sm transition-transform duration-500 [-webkit-touch-callout:none] ${
                completed ? 'border-workout-green/40 bg-workout-green/5' : 'bg-card'
              } ${holdingKey === key ? 'scale-[.97] border-workout-green/60' : ''} ${savingKey === key ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${completed ? 'bg-workout-green/15' : 'bg-primary/10'}`}>
                  {completed
                    ? <CheckCircle2 className="completion-check h-4 w-4 text-workout-green" />
                    : <Dumbbell className="h-4 w-4 text-primary" />}
                </div>
                <div>
                  <h4 className="font-semibold">{workout.title}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{scheduled.startTime}</span>
                    <span>•</span>
                    <span>{workout.duration} min</span>
                  </div>
                </div>
              </div>
              <Button 
                size="sm" 
                variant={completed ? 'outline' : 'default'}
                className="gap-1"
                disabled={completed || savingKey === key}
                aria-label={completed ? `${workout.title} completed` : `Start ${workout.title}`}
                onClick={() => navigate(scheduledWorkoutSessionUrl(scheduled))}
              >
                {completed ? <CheckCircle2 className="completion-check h-4 w-4" /> : <Play className="h-4 w-4" />}
                {completed ? 'Done' : 'Start'}
              </Button>
            </div>
          );
        })}
        {todaysWorkouts.some(scheduled => !isScheduledOccurrenceCompleted(scheduled, sessions)) && (
          <p className="text-xs text-muted-foreground">Done it without the app? Hold a workout to mark it done.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default TodaysFocus;
