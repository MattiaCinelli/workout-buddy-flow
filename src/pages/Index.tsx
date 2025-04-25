
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, ArrowUpRight, Calendar, Clock, Dumbbell, LineChart, Plus, TrendingUp } from "lucide-react";
import Navbar from '@/components/Navbar';
import WorkoutHistory from '@/components/WorkoutHistory';
import ExerciseItem from '@/components/ExerciseItem';
import CreateWorkoutModal from '@/components/CreateWorkoutModal';
import { workoutHistory } from '@/data/workoutHistory';
import { exerciseList } from '@/data/exercises';

const Index = () => {
  const [createWorkoutOpen, setCreateWorkoutOpen] = useState(false);
  
  // Get recent workouts (last 5)
  const recentWorkouts = [...workoutHistory].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 5);
  
  // Get popular exercises (just a few for demo)
  const popularExercises = exerciseList.slice(0, 4);
  
  // Calculate some statistics
  const totalWorkouts = workoutHistory.length;
  const totalMinutes = workoutHistory.reduce((acc, workout) => acc + workout.duration, 0);
  const workoutsByCategory = workoutHistory.reduce((acc, workout) => {
    acc[workout.category] = (acc[workout.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostFrequentCategory = Object.entries(workoutsByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onOpenCreateWorkout={() => setCreateWorkoutOpen(true)} />
      
      <main className="flex-1 container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Track your fitness progress</p>
          </div>
          
          <Button 
            onClick={() => setCreateWorkoutOpen(true)}
            className="mt-4 md:mt-0 bg-workout-blue hover:bg-blue-600 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> New Workout
          </Button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Workouts
              </CardTitle>
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalWorkouts}</div>
              <p className="text-xs text-muted-foreground">
                Keep the momentum going!
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Minutes
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMinutes}</div>
              <p className="text-xs text-muted-foreground">
                Time invested in your health
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Favorite Category
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{mostFrequentCategory}</div>
              <p className="text-xs text-muted-foreground">
                Based on your workout history
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Weekly Trend
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-workout-green">+12%</div>
              <p className="text-xs text-muted-foreground">
                Increase from last week
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content Tabs */}
        <Tabs defaultValue="workouts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="workouts">Recent Workouts</TabsTrigger>
            <TabsTrigger value="exercises">Popular Exercises</TabsTrigger>
          </TabsList>
          
          <TabsContent value="workouts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Recent Workouts</h2>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>View All</span>
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            
            <WorkoutHistory workouts={recentWorkouts} />
          </TabsContent>
          
          <TabsContent value="exercises" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Popular Exercises</h2>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Dumbbell className="h-4 w-4" />
                <span>Exercise Library</span>
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {popularExercises.map((exercise) => (
                <ExerciseItem key={exercise.id} exercise={exercise} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Create Workout Modal */}
      <CreateWorkoutModal 
        isOpen={createWorkoutOpen}
        onClose={() => setCreateWorkoutOpen(false)}
      />
    </div>
  );
};

export default Index;
