import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, ChevronDown, Check } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { 
  startOfWeek, 
  endOfWeek, 
  isWithinInterval, 
  parseISO, 
  startOfToday 
} from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const GOAL_OPTIONS = [2, 3, 4, 5, 6, 7];
const STORAGE_KEY = 'workout-weekly-goal';

const WeeklyGoal: React.FC = () => {
  const { workouts } = useData();
  
  const [weeklyGoal, setWeeklyGoal] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 4;
  });

  const handleGoalChange = (goal: number) => {
    setWeeklyGoal(goal);
    localStorage.setItem(STORAGE_KEY, goal.toString());
  };

  const thisWeekWorkouts = useMemo(() => {
    const today = startOfToday();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    
    return workouts.filter(workout => {
      const workoutDate = parseISO(workout.date);
      return isWithinInterval(workoutDate, { start: weekStart, end: weekEnd });
    });
  }, [workouts]);

  const completedCount = thisWeekWorkouts.length;
  const progress = Math.min((completedCount / weeklyGoal) * 100, 100);
  const isGoalMet = completedCount >= weeklyGoal;
  const remaining = Math.max(weeklyGoal - completedCount, 0);

  const getMessage = () => {
    if (isGoalMet) return "Goal achieved! 🎉";
    if (remaining === 1) return "Just 1 more workout to go!";
    if (completedCount === 0) return "Start your week strong!";
    return `${remaining} more workouts this week`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className={`h-5 w-5 ${isGoalMet ? 'text-accent' : 'text-primary'}`} />
            Weekly Goal
          </CardTitle>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1">
                {weeklyGoal}/week
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              {GOAL_OPTIONS.map((goal) => (
                <DropdownMenuItem 
                  key={goal}
                  onClick={() => handleGoalChange(goal)}
                  className="flex items-center justify-between"
                >
                  <span>{goal} workouts/week</span>
                  {goal === weeklyGoal && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{completedCount}</span>
              <span className="text-muted-foreground">/ {weeklyGoal}</span>
            </div>
            <span className={`text-sm font-medium ${isGoalMet ? 'text-accent' : 'text-muted-foreground'}`}>
              {Math.round(progress)}%
            </span>
          </div>
          
          <Progress 
            value={progress} 
            className={`h-3 ${isGoalMet ? '[&>div]:bg-accent' : ''}`}
          />
          
          <p className="text-sm text-muted-foreground">
            {getMessage()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyGoal;
