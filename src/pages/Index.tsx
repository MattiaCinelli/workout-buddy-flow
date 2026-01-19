import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import CreateWorkoutModal from '@/components/CreateWorkoutModal';
import CalendarPreview from '@/components/dashboard/CalendarPreview';
import TodaysFocus from '@/components/dashboard/TodaysFocus';
import WorkoutStreak from '@/components/dashboard/WorkoutStreak';
import WeeklyGoal from '@/components/dashboard/WeeklyGoal';
import QuickStats from '@/components/dashboard/QuickStats';
import { useData } from '@/contexts/DataContext';

const Index = () => {
  const [createWorkoutOpen, setCreateWorkoutOpen] = useState(false);
  const navigate = useNavigate();
  const { isLoading } = useData();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar onOpenCreateWorkout={() => setCreateWorkoutOpen(true)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your workout data...</p>
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
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Track your fitness progress</p>
          </div>
          
          <Button 
            onClick={() => setCreateWorkoutOpen(true)}
            className="mt-4 md:mt-0"
          >
            <Plus className="mr-2 h-4 w-4" /> New Workout
          </Button>
        </div>
        
        {/* Main Dashboard Grid */}
        <div className="space-y-6">
          {/* Calendar Preview - Full Width */}
          <CalendarPreview onStartWorkout={(id) => navigate(`/workout/${id}/present`)} />
          
          {/* Today's Focus + Streak/Goal Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <TodaysFocus />
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <WorkoutStreak />
              <WeeklyGoal />
            </div>
          </div>
          
          {/* Quick Stats */}
          <QuickStats />
        </div>
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
