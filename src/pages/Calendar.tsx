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
import { CalendarDays } from 'lucide-react';

const CalendarPage: React.FC = () => {
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState<ExpandedScheduledWorkout | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ExpandedScheduledWorkout | null>(null);
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
    setEditingSchedule(null);
    setSelectedDate(date);
    setIsScheduleModalOpen(true);
  };

  const handleScheduleClick = (schedule: ExpandedScheduledWorkout) => {
    setSelectedSchedule(schedule);
    setIsDetailModalOpen(true);
  };

  const handleEditClick = (schedule: ExpandedScheduledWorkout) => {
    setIsDetailModalOpen(false);
    setEditingSchedule(schedule);
    setIsScheduleModalOpen(true);
  };

  const handleScheduleModalClose = () => {
    setIsScheduleModalOpen(false);
    setEditingSchedule(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="app-page">
        <div className="page-heading">
          <div className="page-heading__main">
            <div className="page-heading__icon"><CalendarDays className="h-5 w-5" /></div>
            <div>
              <h1 className="page-title">Workout calendar</h1>
              <p className="page-subtitle">Plan sessions and keep your training week organized</p>
            </div>
          </div>
          <div className="page-actions">
          <Tabs value={view} onValueChange={(v) => setView(v as 'week' | 'month')}>
            <TabsList className="grid w-44 grid-cols-2">
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          </div>
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
        onClose={handleScheduleModalClose}
        selectedDate={selectedDate}
        onScheduleCreated={refreshScheduledWorkouts}
        editingSchedule={editingSchedule}
      />

      <ScheduleDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        schedule={selectedSchedule}
        onDeleted={refreshScheduledWorkouts}
        onEdit={handleEditClick}
      />
    </div>
  );
};

export default CalendarPage;
