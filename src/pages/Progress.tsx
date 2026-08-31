import React, { useState, useMemo } from 'react';
import { Loader2, TrendingUp, Calendar, Dumbbell, Timer, Trash2 } from "lucide-react";
import Navbar from '@/components/Navbar';
import { useData } from '@/contexts/DataContext';
import { WORKOUT_CATEGORIES, WORKOUT_CATEGORY_LABELS } from '@/data/workoutHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';
import { format, parseISO, endOfWeek, eachWeekOfInterval, subMonths, isWithinInterval } from 'date-fns';
import { describeSeries } from '@/lib/chartA11y';
import { BodyWeightCard } from '@/components/dashboard/BodyWeightCard';
import { PersonalRecordsCard } from '@/components/dashboard/PersonalRecordsCard';
import { muscleGroupLoad } from '@/lib/muscleGroupVolume';

const ProgressPage = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('3months');
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false);
  const {
    sessions: workouts, exercises, muscleGroups,
    sessionsLoading: workoutsLoading, clearAllSessions: clearAllWorkouts,
  } = useData();

  const dateRange = useMemo(() => {
    const end = new Date();
    let start: Date;
    switch (timeRange) {
      case '1month':
        start = subMonths(end, 1);
        break;
      case '3months':
        start = subMonths(end, 3);
        break;
      case '6months':
        start = subMonths(end, 6);
        break;
      case '1year':
        start = subMonths(end, 12);
        break;
      default:
        start = subMonths(end, 3);
    }
    return { start, end };
  }, [timeRange]);

  const filteredWorkouts = useMemo(() => {
    return workouts.filter(w => {
      const workoutDate = parseISO(w.date);
      return isWithinInterval(workoutDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [workouts, dateRange]);

  // Weekly workout frequency data
  const weeklyData = useMemo(() => {
    if (filteredWorkouts.length === 0) return [];
    
    const weeks = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart);
      const workoutsInWeek = filteredWorkouts.filter(w => {
        const date = parseISO(w.date);
        return isWithinInterval(date, { start: weekStart, end: weekEnd });
      });
      
      const totalDuration = workoutsInWeek.reduce((sum, w) => sum + w.duration, 0);
      
      return {
        week: format(weekStart, 'MMM d'),
        workouts: workoutsInWeek.length,
        duration: totalDuration,
      };
    });
  }, [filteredWorkouts, dateRange]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = Object.fromEntries(
      WORKOUT_CATEGORIES.map(category => [category, 0]),
    );

    filteredWorkouts.forEach(w => {
      categories[w.category]++;
    });

    return Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .map(([name, count]) => ({
        name: WORKOUT_CATEGORY_LABELS[name as keyof typeof WORKOUT_CATEGORY_LABELS] ?? name,
        count,
      }));
  }, [filteredWorkouts]);

  const muscleData = useMemo(() => {
    const groupName = (id: string) => muscleGroups.find(group => group.id === id)?.name ?? id;
    return muscleGroupLoad(filteredWorkouts, exercises).map(row => ({
      name: groupName(row.muscleGroupId),
      sets: row.sets,
      volume: row.volume,
    }));
  }, [filteredWorkouts, exercises, muscleGroups]);

  // Duration trend data
  const durationTrend = useMemo(() => {
    return filteredWorkouts
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .map(w => ({
        date: format(parseISO(w.date), 'MMM d'),
        duration: w.duration,
        title: w.title,
      }));
  }, [filteredWorkouts]);

  // Summary stats
  const stats = useMemo(() => {
    const totalWorkouts = filteredWorkouts.length;
    const totalDuration = filteredWorkouts.reduce((sum, w) => sum + w.duration, 0);
    const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;
    const totalSets = filteredWorkouts.reduce((sum, w) => sum + w.sets.length, 0);
    
    return { totalWorkouts, totalDuration, avgDuration, totalSets };
  }, [filteredWorkouts]);

  if (workoutsLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading progress data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto py-6 px-4 md:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Progress</h1>
            <p className="text-muted-foreground">Track your fitness journey over time</p>
          </div>
          
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => setClearHistoryOpen(true)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Clear history
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Dumbbell className="h-4 w-4" />
                <span className="text-sm">Workouts</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalWorkouts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Timer className="h-4 w-4" />
                <span className="text-sm">Total Time</span>
              </div>
              <p className="text-2xl font-bold">{Math.floor(stats.totalDuration / 60)}h {stats.totalDuration % 60}m</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Avg Duration</span>
              </div>
              <p className="text-2xl font-bold">{stats.avgDuration}m</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Total Sets</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalSets}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {filteredWorkouts.length > 0 ? (
          <Tabs defaultValue="frequency" className="space-y-4">
            <TabsList>
              <TabsTrigger value="frequency">Workout Frequency</TabsTrigger>
              <TabsTrigger value="duration">Duration Trend</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="muscles">Muscle Groups</TabsTrigger>
            </TabsList>

            <TabsContent value="frequency">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Workout Frequency</CardTitle>
                  <CardDescription>Number of workouts per week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]" role="img" aria-label={describeSeries('Workouts per week', weeklyData.map(d => d.workouts), 'workouts')}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart accessibilityLayer data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" className="text-xs" />
                        <YAxis allowDecimals={false} className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="workouts" 
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary) / 0.2)" 
                          name="Workouts"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="duration">
              <Card>
                <CardHeader>
                  <CardTitle>Workout Duration Trend</CardTitle>
                  <CardDescription>Duration of each workout over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]" role="img" aria-label={describeSeries('Workout duration', durationTrend.map(d => d.duration), 'minutes')}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart accessibilityLayer data={durationTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" unit="m" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`${value} min`, 'Duration']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="duration" 
                          stroke="hsl(var(--accent))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--accent))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories">
              <Card>
                <CardHeader>
                  <CardTitle>Workout Categories</CardTitle>
                  <CardDescription>Distribution of workout types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]" role="img" aria-label={`Workouts by category: ${categoryData.map(c => `${c.name} ${c.count}`).join(', ') || 'no data'}.`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart accessibilityLayer data={categoryData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" allowDecimals={false} className="text-xs" />
                        <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="hsl(var(--primary))" 
                          radius={[0, 4, 4, 0]}
                          name="Workouts"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="muscles">
              <Card>
                <CardHeader>
                  <CardTitle>Muscle Group Volume</CardTitle>
                  <CardDescription>Completed working sets per muscle group in this period</CardDescription>
                </CardHeader>
                <CardContent>
                  {muscleData.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      No sets tagged to muscle groups yet — add muscle groups to your exercises to see this.
                    </p>
                  ) : (
                    <div style={{ height: Math.max(200, muscleData.length * 34) }}
                      role="img" aria-label={`Sets per muscle group: ${muscleData.map(m => `${m.name} ${m.sets}`).join(', ')}.`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart accessibilityLayer data={muscleData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" allowDecimals={false} className="text-xs" />
                          <YAxis dataKey="name" type="category" className="text-xs" width={90} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number, name) => [value, name === 'sets' ? 'Sets' : 'Volume (kg)']}
                          />
                          <Bar dataKey="sets" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="sets" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No workout data yet</h2>
              <p className="text-muted-foreground">
                Complete some workouts to see your progress charts here
              </p>
              <Button className="mt-4" onClick={() => navigate('/workouts')}>Choose a workout</Button>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PersonalRecordsCard />
          <BodyWeightCard />
        </div>
      </main>
      <AlertDialog open={clearHistoryOpen} onOpenChange={setClearHistoryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Workout History?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All your workout history and progress data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await clearAllWorkouts();
                toast.success("All workout history has been cleared");
              }}
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProgressPage;
