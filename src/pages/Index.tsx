import React from 'react';
import { Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import CalendarPreview from '@/components/dashboard/CalendarPreview';
import TodaysFocus from '@/components/dashboard/TodaysFocus';
import WorkoutStreak from '@/components/dashboard/WorkoutStreak';
import WeeklyGoal from '@/components/dashboard/WeeklyGoal';
import QuickStats from '@/components/dashboard/QuickStats';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { useData } from '@/contexts/DataContext';
import { scheduledWorkoutSessionUrl } from '@/lib/workoutSessionUrl';

const Index = () => {
  const navigate = useNavigate();
  const { isLoading } = useData();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your workout data...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="lcars-app min-h-screen flex flex-col bg-background">
      <Navbar />
      <OnboardingDialog />

      <main className="lcars-main flex-1 container mx-auto py-6 px-4 md:px-6">
        {/* Header */}
        <div className="lcars-page-heading flex flex-col md:flex-row justify-between items-start md:items-end mb-6">
          <div>
            <div className="lcars-eyebrow">WB-1701 • TRAINING SYSTEM ONLINE</div>
            <h1 className="text-3xl font-bold">Fitness Command</h1>
            <p className="text-muted-foreground">Personal performance telemetry</p>
          </div>
          <div className="lcars-status mt-4 md:mt-0" aria-label="System status: active">
            <span className="lcars-status-dot" /> SYSTEM ACTIVE
          </div>
        </div>
        
        {/* Main Dashboard Grid */}
        <div className="space-y-6">
          {/* Calendar Preview - Full Width */}
          <CalendarPreview onStartWorkout={(schedule) => navigate(scheduledWorkoutSessionUrl(schedule))} />
          
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
      
      <footer className="lcars-footer" aria-hidden="true">
        <span>47-ALPHA</span><span /><span /><span>FITNESS CORE</span>
      </footer>
      {/* Create Workout Modal */}    </div>
  );
};

export default Index;
