import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Clock, Dumbbell, TrendingUp } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { 
  startOfWeek, 
  endOfWeek, 
  subWeeks,
  isWithinInterval, 
  parseISO, 
  startOfToday 
} from 'date-fns';

const QuickStats: React.FC = () => {
  const { sessions: workouts } = useData();
  
  const today = startOfToday();
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
  
  const thisWeekWorkouts = workouts.filter(w => 
    isWithinInterval(parseISO(w.date), { start: thisWeekStart, end: thisWeekEnd })
  );
  
  const lastWeekWorkouts = workouts.filter(w => 
    isWithinInterval(parseISO(w.date), { start: lastWeekStart, end: lastWeekEnd })
  );
  
  const totalWorkouts = workouts.length;
  const totalMinutes = workouts.reduce((acc, w) => acc + w.duration, 0);
  
  const thisWeekMinutes = thisWeekWorkouts.reduce((acc, w) => acc + w.duration, 0);
  const lastWeekMinutes = lastWeekWorkouts.reduce((acc, w) => acc + w.duration, 0);
  
  const weeklyChange = lastWeekMinutes > 0 
    ? Math.round(((thisWeekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100)
    : thisWeekMinutes > 0 ? 100 : 0;

  const workoutsByCategory = workouts.reduce((acc, w) => {
    acc[w.category] = (acc[w.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostFrequentCategory = Object.entries(workoutsByCategory)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  const stats = [
    {
      label: 'Total Workouts',
      value: totalWorkouts.toString(),
      subtext: 'All time',
      icon: Dumbbell,
      iconColor: 'text-primary'
    },
    {
      label: 'Total Time',
      value: totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`,
      subtext: 'Time invested',
      icon: Clock,
      iconColor: 'text-blue-500'
    },
    {
      label: 'Favorite',
      value: mostFrequentCategory,
      subtext: 'Most common',
      icon: Activity,
      iconColor: 'text-purple-500',
      capitalize: true
    },
    {
      label: 'Weekly Trend',
      value: weeklyChange >= 0 ? `+${weeklyChange}%` : `${weeklyChange}%`,
      subtext: 'vs last week',
      icon: TrendingUp,
      iconColor: weeklyChange >= 0 ? 'text-accent' : 'text-destructive'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, idx) => (
        <Card key={idx} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            </div>
            <div className={`text-xl font-bold ${stat.capitalize ? 'capitalize' : ''}`}>
              {stat.value}
            </div>
            <p className="text-xs text-muted-foreground">{stat.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QuickStats;
