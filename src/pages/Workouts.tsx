import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Dumbbell } from "lucide-react";
import Navbar from '@/components/Navbar';
import CreateWorkoutModal from '@/components/CreateWorkoutModal';
import WorkoutCard from '@/components/WorkoutCard';
import { useData } from '@/contexts/DataContext';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WorkoutsPage = () => {
  const [createWorkoutOpen, setCreateWorkoutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { workouts, workoutsLoading } = useData();

  const filteredWorkouts = workouts.filter(workout => {
    const matchesSearch = workout.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || workout.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (workoutsLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading workouts...</p>
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
            <h1 className="text-3xl font-bold">My Workouts</h1>
            <p className="text-muted-foreground">
              {workouts.length} workout{workouts.length !== 1 ? 's' : ''} created
            </p>
          </div>
          
          <Button 
            onClick={() => setCreateWorkoutOpen(true)}
            className="mt-4 md:mt-0"
          >
            <Plus className="mr-2 h-4 w-4" /> Create Workout
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workouts..."
              aria-label="Search workouts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="strength">Strength</SelectItem>
              <SelectItem value="cardio">Cardio</SelectItem>
              <SelectItem value="flexibility">Flexibility</SelectItem>
              <SelectItem value="balance">Balance</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Workouts Grid */}
        {filteredWorkouts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkouts.map(workout => (
              <WorkoutCard 
                key={workout.id} 
                workout={workout}
              />
            ))}
          </div>
        ) : workouts.length > 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No workouts match your filters</p>
            <Button 
              variant="link" 
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="text-center py-16">
            <Dumbbell className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No workouts yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first workout to get started on your fitness journey
            </p>
            <Button onClick={() => setCreateWorkoutOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Your First Workout
            </Button>
          </div>
        )}
      </main>
      
      <CreateWorkoutModal 
        isOpen={createWorkoutOpen}
        onClose={() => setCreateWorkoutOpen(false)}
      />
    </div>
  );
};

export default WorkoutsPage;
