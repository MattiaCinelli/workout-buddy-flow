
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Play, Edit } from 'lucide-react';
import { workoutHistory, WorkoutSet } from '@/data/workoutHistory';
import { exerciseList } from '@/data/exercises';
import Navbar from '@/components/Navbar';

const WorkoutDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Find the workout by ID
  const workout = workoutHistory.find(w => w.id === id);
  
  // If workout not found, redirect to 404
  if (!workout) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Workout not found</h1>
        <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
      </div>
    );
  }
  
  // Format date
  const formattedDate = new Date(workout.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  // Group sets by exercise
  const exercises = workout.sets.reduce((acc, set) => {
    if (!acc[set.exerciseId]) {
      acc[set.exerciseId] = [];
    }
    acc[set.exerciseId].push(set);
    return acc;
  }, {} as Record<string, WorkoutSet[]>);
  
  // Get category color
  const getCategoryColor = () => {
    switch (workout.category) {
      case 'strength': return 'bg-workout-blue text-white';
      case 'cardio': return 'bg-workout-red text-white';
      case 'flexibility': return 'bg-workout-purple text-white';
      case 'balance': return 'bg-workout-yellow text-black';
      case 'mixed': return 'bg-workout-green text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onOpenCreateWorkout={() => {}} />
      
      <main className="flex-1 container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            
            <div className="ml-auto flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>
              
              <Button 
                size="sm" 
                className="bg-workout-green hover:bg-green-600 text-white flex items-center gap-1"
              >
                <Play className="h-4 w-4" />
                <span>Start Workout</span>
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
            <h1 className="text-3xl font-bold">{workout.title}</h1>
            <Badge className={`${getCategoryColor()} capitalize self-start md:self-auto`}>
              {workout.category}
            </Badge>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 text-muted-foreground mb-8">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{workout.duration} minutes</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {Object.entries(exercises).map(([exerciseId, sets]) => {
            const exercise = exerciseList.find(ex => ex.id === exerciseId);
            if (!exercise) return null;
            
            return (
              <Card key={exerciseId} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <h2 className="text-xl font-semibold">{exercise.name}</h2>
                    <Badge className="self-start md:self-auto">{exercise.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{exercise.muscleGroups.join(', ')}</p>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <Table className="border-t">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Set</TableHead>
                        {exercise.category === 'strength' && (
                          <>
                            <TableHead>Reps</TableHead>
                            <TableHead>Weight</TableHead>
                          </>
                        )}
                        {(exercise.category === 'cardio' || exercise.category === 'flexibility') && (
                          <>
                            <TableHead>Duration</TableHead>
                            {exercise.category === 'cardio' && <TableHead>Distance</TableHead>}
                          </>
                        )}
                        <TableHead>Rest</TableHead>
                      </TableRow>
                    </TableHeader>
                    
                    <TableBody>
                      {sets.map((set, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          
                          {exercise.category === 'strength' && (
                            <>
                              <TableCell>{set.reps || '-'}</TableCell>
                              <TableCell>{set.weight ? `${set.weight} lbs` : '-'}</TableCell>
                            </>
                          )}
                          
                          {(exercise.category === 'cardio' || exercise.category === 'flexibility') && (
                            <>
                              <TableCell>{set.duration ? `${set.duration} sec` : '-'}</TableCell>
                              {exercise.category === 'cardio' && (
                                <TableCell>{set.distance ? `${set.distance} m` : '-'}</TableCell>
                              )}
                            </>
                          )}
                          
                          <TableCell>{index < sets.length - 1 ? '60 sec' : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default WorkoutDetail;
