import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Search, X, Filter, Dumbbell } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, isSameDay, startOfDay, endOfDay } from 'date-fns';
import Navbar from '@/components/Navbar';
import WorkoutCard from '@/components/WorkoutCard';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';

type CategoryFilter = 'all' | 'strength' | 'cardio' | 'flexibility' | 'balance' | 'mixed';
type SortOption = 'newest' | 'oldest' | 'duration-high' | 'duration-low';

const HistoryPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  
  const { sessions: workouts } = useData();

  const filteredAndSortedWorkouts = useMemo(() => {
    let result = [...workouts];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(w => 
        w.title.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(w => w.category === categoryFilter);
    }

    // Date range filter
    if (startDate) {
      result = result.filter(w => {
        const workoutDate = parseISO(w.date);
        return isSameDay(workoutDate, startDate) || isAfter(workoutDate, startOfDay(startDate));
      });
    }
    
    if (endDate) {
      result = result.filter(w => {
        const workoutDate = parseISO(w.date);
        return isSameDay(workoutDate, endDate) || isBefore(workoutDate, endOfDay(endDate));
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'duration-high':
          return b.duration - a.duration;
        case 'duration-low':
          return a.duration - b.duration;
        default:
          return 0;
      }
    });

    return result;
  }, [workouts, searchQuery, categoryFilter, sortBy, startDate, endDate]);

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setSortBy('newest');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || startDate || endDate;

  const categories: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: 'All Categories' },
    { value: 'strength', label: 'Strength' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'flexibility', label: 'Flexibility' },
    { value: 'balance', label: 'Balance' },
    { value: 'mixed', label: 'Mixed' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto py-6 px-4 md:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Workout History</h1>
            <p className="text-muted-foreground">
              {workouts.length} workout{workouts.length !== 1 ? 's' : ''} logged
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border rounded-lg p-4 mb-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workouts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category */}
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range - Start */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'MMM d, yyyy') : 'From date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Date Range - End */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'MMM d, yyyy') : 'To date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Sort + Clear */}
          <div className="flex items-center justify-between">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="duration-high">Longest duration</SelectItem>
                <SelectItem value="duration-low">Shortest duration</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Results count */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">
              {filteredAndSortedWorkouts.length} result{filteredAndSortedWorkouts.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}

        {/* Workout List */}
        {filteredAndSortedWorkouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted rounded-full p-4 mb-4">
              <Dumbbell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">
              {hasActiveFilters ? 'No workouts match your filters' : 'No workouts yet'}
            </h3>
            <p className="text-muted-foreground mt-1 max-w-sm">
              {hasActiveFilters 
                ? 'Try adjusting your filters or clearing them to see more results'
                : 'Create your first workout to start tracking your progress'
              }
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedWorkouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>
        )}
      </main>    </div>
  );
};

export default HistoryPage;
