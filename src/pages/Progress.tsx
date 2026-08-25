import React, { useState, useMemo, useRef } from 'react';
import { Loader2, TrendingUp, Calendar, Dumbbell, Timer, Settings2, Trash2, Download, Upload } from "lucide-react";
import Navbar from '@/components/Navbar';
import CreateWorkoutModal from '@/components/CreateWorkoutModal';
import { useData } from '@/contexts/DataContext';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, eachWeekOfInterval, subMonths, isWithinInterval } from 'date-fns';
import { downloadBackup, parseBackup, restoreBackup, WorkoutBuddyBackup } from '@/lib/backup';
import { scheduleWorkoutReminders } from '@/lib/notifications';

const ProgressPage = () => {
  const [createWorkoutOpen, setCreateWorkoutOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('3months');
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<WorkoutBuddyBackup | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const { sessions: workouts, sessionsLoading: workoutsLoading, exercises, clearAllSessions: clearAllWorkouts } = useData();

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
    const categories: Record<string, number> = {
      strength: 0,
      cardio: 0,
      flexibility: 0,
      balance: 0,
      mixed: 0,
    };
    
    filteredWorkouts.forEach(w => {
      categories[w.category]++;
    });
    
    return Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
      }));
  }, [filteredWorkouts]);

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
        <Navbar onOpenCreateWorkout={() => setCreateWorkoutOpen(true)} />
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
      <Navbar onOpenCreateWorkout={() => setCreateWorkoutOpen(true)} />
      
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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={async () => {
                  try { await downloadBackup(); toast.success('Backup downloaded'); }
                  catch { toast.error('Could not create backup'); }
                }}>
                  <Download className="h-4 w-4 mr-2" />Export Backup
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => backupInput.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />Restore Backup
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => setClearHistoryOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <input ref={backupInput} type="file" accept="application/json,.json" className="hidden" onChange={async event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            try {
              setPendingBackup(parseBackup(await file.text()));
              setRestoreOpen(true);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Invalid backup file');
            }
          }} />
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
            </TabsList>

            <TabsContent value="frequency">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Workout Frequency</CardTitle>
                  <CardDescription>Number of workouts per week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyData}>
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
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={durationTrend}>
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
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} layout="vertical">
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
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No workout data yet</h2>
              <p className="text-muted-foreground">
                Complete some workouts to see your progress charts here
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      
      <CreateWorkoutModal 
        isOpen={createWorkoutOpen}
        onClose={() => setCreateWorkoutOpen(false)}
      />
      
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
      <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Replace all local data?</AlertDialogTitle><AlertDialogDescription>This restores the selected backup and replaces exercises, templates, sessions, schedules and courses currently on this device. Export a backup first if you may need the current data.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => {
            if (!pendingBackup) return;
            try {
              await restoreBackup(pendingBackup);
              await Promise.all(pendingBackup.data.scheduledWorkouts.map(schedule =>
                scheduleWorkoutReminders(schedule, pendingBackup.data.workouts.find(workout => workout.id === schedule.workoutId)?.title || 'Workout')
              ));
              window.location.reload();
            }
            catch { toast.error('Restore failed; current data was not reloaded'); }
          }}>Restore and replace</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProgressPage;
