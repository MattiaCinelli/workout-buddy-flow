import React from 'react';
import { Activity, Loader2 } from "lucide-react";
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
  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  }).format(new Date());

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

      <main className="lcars-main app-page">
        {/* Header */}
        <div className="dashboard-hero lcars-page-heading page-heading">
          <div className="page-heading__main">
            <div className="page-heading__icon"><Activity className="h-5 w-5" /></div>
            <div>
            <div className="lcars-eyebrow">WB-1701 • TRAINING SYSTEM ONLINE</div>
              <h1 className="page-title">Training overview</h1>
              <p className="page-subtitle">{todayLabel} · Your activity at a glance</p>
            </div>
          </div>
          <div className="lcars-status" aria-label="System status: active">
            <span className="lcars-status-dot" /> SYSTEM ACTIVE
          </div>
        </div>
        
        {/* Main Dashboard Grid */}
        <div className="space-y-5">
          {/* Put the actionable part of the day before supporting analytics. */}
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <TodaysFocus />
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:col-span-7">
              <WorkoutStreak />
              <WeeklyGoal />
            </div>
          </div>

          <QuickStats />

          <CalendarPreview onStartWorkout={(schedule) => navigate(scheduledWorkoutSessionUrl(schedule))} />
        </div>
      </main>
      
      <footer className="lcars-footer" aria-hidden="true">
        <span>47-ALPHA</span><span /><span /><span>FITNESS CORE</span>
      </footer>
      {/* Create Workout Modal */}    </div>
  );
};

export default Index;
