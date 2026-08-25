import React, { useState, useCallback } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';
import Navbar from '@/components/Navbar';
import WeeklyCalendar from '@/components/calendar/WeeklyCalendar';
import MonthlyCalendar from '@/components/calendar/MonthlyCalendar';
import ScheduleWorkoutModal from '@/components/calendar/ScheduleWorkoutModal';
import ScheduleDetailModal from '@/components/calendar/ScheduleDetailModal';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { ExpandedScheduledWorkout } from '@/hooks/useScheduledWorkouts';

const CalendarPage: React.FC = () => {
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState<ExpandedScheduledWorkout | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');

  const { workouts, getScheduledWorkoutsForRange, refreshScheduledWorkouts } = useData();

  const getDateRange = useCallback(() => {
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return { start, end };
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const start = startOfWeek(monthStart, { weekStartsOn: 1 });
      const end = addDays(endOfWeek(monthEnd, { weekStartsOn: 1 }), 1);
      return { start, end };
    }
  }, [currentDate, view]);

  const { start, end } = getDateRange();
  const scheduledWorkouts = getScheduledWorkoutsForRange(start, end);

  const handleAddClick = (date: Date) => {
    setSelectedDate(date);
    setIsScheduleModalOpen(true);
  };

  const handleScheduleClick = (schedule: ExpandedScheduledWorkout) => {
    setSelectedSchedule(schedule);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Workout Calendar</h1>
          <Tabs value={view} onValueChange={(v) => setView(v as 'week' | 'month')}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {view === 'week' ? (
          <WeeklyCalendar
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            scheduledWorkouts={scheduledWorkouts}
            workouts={workouts}
            onAddClick={handleAddClick}
            onScheduleClick={handleScheduleClick}
          />
        ) : (
          <MonthlyCalendar
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            scheduledWorkouts={scheduledWorkouts}
            workouts={workouts}
            onAddClick={handleAddClick}
            onScheduleClick={handleScheduleClick}
          />
        )}
      </main>

      <ScheduleWorkoutModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        selectedDate={selectedDate}
        onScheduleCreated={refreshScheduledWorkouts}
      />

      <ScheduleDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        schedule={selectedSchedule}
        onDeleted={refreshScheduledWorkouts}
      />
    </div>
  );
};

export default CalendarPage;
