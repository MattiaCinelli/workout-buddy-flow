
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Exercise, createExercise, updateExercise, deleteExercise, getAllExercises } from '@/data/exercises';
import ExerciseItem from './ExerciseItem';
import ExerciseForm from './ExerciseForm';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, FileImage, Pencil } from 'lucide-react';

const ExerciseManager: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>(getAllExercises());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise | undefined>(undefined);
  
  const filteredExercises = exercises.filter(exercise => 
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.muscleGroups.some(group => 
      group.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  
  const handleCreateExercise = (exerciseData: Omit<Exercise, 'id'>) => {
    const newExercise = createExercise(exerciseData);
    setExercises([...exercises, newExercise]);
    toast({
      title: "Exercise created",
      description: `${newExercise.name} has been created successfully.`,
    });
    setIsFormOpen(false);
  };
  
  const handleUpdateExercise = (exerciseData: Omit<Exercise, 'id'>) => {
    if (currentExercise) {
      const updated = updateExercise(currentExercise.id, exerciseData);
      if (updated) {
        setExercises(exercises.map(ex => ex.id === updated.id ? updated : ex));
        toast({
          title: "Exercise updated",
          description: `${updated.name} has been updated successfully.`,
        });
      }
    }
    setIsFormOpen(false);
    setCurrentExercise(undefined);
  };
  
  const handleEdit = (exercise: Exercise) => {
    setCurrentExercise(exercise);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setCurrentExercise(undefined);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Exercise Library</h2>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="bg-workout-blue hover:bg-blue-600"
        >
          <Plus className="mr-2 h-4 w-4" /> New Exercise
        </Button>
      </div>
      
      <div className="relative mb-4">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search exercises..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="space-y-3">
        {filteredExercises.length > 0 ? (
          filteredExercises.map((exercise) => (
            <ExerciseItem
              key={exercise.id}
              exercise={exercise}
              onEdit={handleEdit}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
            <FileImage className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No exercises found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery 
                ? "Try adjusting your search query" 
                : "Get started by creating a new exercise"}
            </p>
            {!searchQuery && (
              <div className="mt-6">
                <Button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-workout-blue hover:bg-blue-600"
                >
                  <Plus className="mr-2 h-4 w-4" /> New Exercise
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentExercise ? 'Edit Exercise' : 'Create Exercise'}</DialogTitle>
            <DialogDescription>
              {currentExercise 
                ? 'Update the exercise details below.' 
                : 'Fill in the exercise details to create a new exercise.'}
            </DialogDescription>
          </DialogHeader>
          
          <ExerciseForm 
            exercise={currentExercise} 
            onSubmit={currentExercise ? handleUpdateExercise : handleCreateExercise}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExerciseManager;
