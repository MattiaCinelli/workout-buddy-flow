import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Trophy, Calendar } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { format, subDays, isSameDay, parseISO, startOfToday, differenceInDays } from 'date-fns';

const WorkoutStreak: React.FC = () => {
  const { workouts } = useData();
  
  const streakData = useMemo(() => {
    if (workouts.length === 0) {
      return { currentStreak: 0, longestStreak: 0, lastWorkoutDaysAgo: null };
    }

    // Sort workouts by date descending
    const sortedWorkouts = [...workouts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const today = startOfToday();
    const workoutDates = new Set(
      sortedWorkouts.map(w => format(parseISO(w.date), 'yyyy-MM-dd'))
    );
    
    // Calculate current streak
    let currentStreak = 0;
    let checkDate = today;
    
    // Check if there's a workout today or yesterday to start the streak
    const todayStr = format(today, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');
    
    if (workoutDates.has(todayStr)) {
      currentStreak = 1;
      checkDate = subDays(today, 1);
    } else if (workoutDates.has(yesterdayStr)) {
      currentStreak = 1;
      checkDate = subDays(today, 2);
    } else {
      currentStreak = 0;
    }
    
    // Count consecutive days backwards
    if (currentStreak > 0) {
      while (workoutDates.has(format(checkDate, 'yyyy-MM-dd'))) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      }
    }
    
    // Calculate longest streak (simplified - check last 365 days)
    let longestStreak = 0;
    let tempStreak = 0;
    
    for (let i = 0; i < 365; i++) {
      const dateStr = format(subDays(today, i), 'yyyy-MM-dd');
      if (workoutDates.has(dateStr)) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    // Days since last workout
    const lastWorkoutDate = sortedWorkouts[0]?.date;
    const lastWorkoutDaysAgo = lastWorkoutDate 
      ? differenceInDays(today, parseISO(lastWorkoutDate))
      : null;
    
    return { currentStreak, longestStreak, lastWorkoutDaysAgo };
  }, [workouts]);

  const getStreakMessage = () => {
    if (streakData.currentStreak === 0) {
      if (streakData.lastWorkoutDaysAgo === null) {
        return "Start your first workout!";
      }
      if (streakData.lastWorkoutDaysAgo <= 2) {
        return "Work out today to start a streak!";
      }
      return "Time to get back on track!";
    }
    if (streakData.currentStreak >= 7) {
      return "You're on fire! 🔥";
    }
    if (streakData.currentStreak >= 3) {
      return "Great momentum!";
    }
    return "Keep it going!";
  };

  const getFlameColor = () => {
    if (streakData.currentStreak >= 7) return 'text-orange-500';
    if (streakData.currentStreak >= 3) return 'text-amber-500';
    if (streakData.currentStreak >= 1) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flame className={`h-5 w-5 ${getFlameColor()}`} />
          Workout Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{streakData.currentStreak}</span>
              <span className="text-muted-foreground">days</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {getStreakMessage()}
            </p>
          </div>
          
          <div className="text-right space-y-1">
            <div className="flex items-center gap-1 text-sm">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">Best:</span>
              <span className="font-semibold">{streakData.longestStreak} days</span>
            </div>
            {streakData.lastWorkoutDaysAgo !== null && streakData.lastWorkoutDaysAgo > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Last: {streakData.lastWorkoutDaysAgo === 1 ? 'Yesterday' : `${streakData.lastWorkoutDaysAgo} days ago`}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Visual streak indicator */}
        <div className="mt-4 flex gap-1">
          {Array.from({ length: 7 }).map((_, idx) => {
            const isActive = idx < streakData.currentStreak;
            return (
              <div 
                key={idx}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  isActive 
                    ? streakData.currentStreak >= 7 
                      ? 'bg-orange-500' 
                      : streakData.currentStreak >= 3 
                        ? 'bg-amber-500' 
                        : 'bg-yellow-500'
                    : 'bg-muted'
                }`}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkoutStreak;
