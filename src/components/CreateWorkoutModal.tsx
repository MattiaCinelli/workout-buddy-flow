
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Exercise, exerciseList } from '@/data/exercises';
import ExerciseItem from './ExerciseItem';
import { useToast } from '@/hooks/use-toast';
import { Search, Minus, Plus, Clock, Check } from 'lucide-react';
import { WorkoutSet } from '@/data/workoutHistory';

interface CreateWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SelectedExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
}

const CreateWorkoutModal: React.FC<CreateWorkoutModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [activeTab, setActiveTab] = useState('exercises');
  const { toast } = useToast();
  
  const filteredExercises = exerciseList.filter(exercise => 
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.muscleGroups.some(group => 
      group.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Here we would normally save the workout
    // For now we'll just show a toast
    toast({
      title: "Workout created!",
      description: `"${title}" has been created with ${selectedExercises.length} exercises.`,
    });
    
    // Reset form and close modal
    setTitle('');
    setCategory('');
    setSearchQuery('');
    setSelectedExercises([]);
    onClose();
  };
  
  const handleSelectExercise = (exercise: Exercise) => {
    // Check if exercise is already selected
    if (selectedExercises.some(item => item.exercise.id === exercise.id)) {
      toast({
        title: "Already added",
        description: `${exercise.name} is already in your workout.`,
      });
      return;
    }
    
    // Create default sets based on exercise category
    const defaultSets: WorkoutSet[] = [];
    const isTimeBasedExercise = exercise.category === 'cardio' || exercise.category === 'flexibility';
    
    // Add default set
    defaultSets.push({
      exerciseId: exercise.id,
      reps: isTimeBasedExercise ? undefined : 12,
      weight: exercise.category === 'strength' ? 50 : undefined,
      duration: isTimeBasedExercise ? 60 : undefined, // 60 seconds default
      distance: exercise.category === 'cardio' ? 1000 : undefined, // 1000m default for cardio
    });
    
    // Add exercise with default sets
    setSelectedExercises([
      ...selectedExercises, 
      { 
        exercise, 
        sets: defaultSets
      }
    ]);
    
    // Switch to selected tab
    setActiveTab('selected');
    
    toast({
      title: "Exercise added",
      description: `${exercise.name} added to workout.`,
    });
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter(item => item.exercise.id !== exerciseId));
    
    toast({
      title: "Exercise removed",
      description: "Exercise removed from workout.",
    });
  };

  const handleAddSet = (exerciseIndex: number) => {
    const updatedExercises = [...selectedExercises];
    const currentExercise = updatedExercises[exerciseIndex];
    const lastSet = currentExercise.sets[currentExercise.sets.length - 1];
    
    // Copy values from the last set as defaults for the new set
    const newSet: WorkoutSet = {
      exerciseId: currentExercise.exercise.id,
      reps: lastSet.reps,
      weight: lastSet.weight,
      duration: lastSet.duration,
      distance: lastSet.distance
    };
    
    updatedExercises[exerciseIndex].sets.push(newSet);
    setSelectedExercises(updatedExercises);
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...selectedExercises];
    
    // Don't remove if it's the last set
    if (updatedExercises[exerciseIndex].sets.length <= 1) {
      toast({
        title: "Cannot remove set",
        description: "Each exercise must have at least one set.",
      });
      return;
    }
    
    updatedExercises[exerciseIndex].sets.splice(setIndex, 1);
    setSelectedExercises(updatedExercises);
  };

  const updateSetValue = (
    exerciseIndex: number, 
    setIndex: number, 
    field: keyof WorkoutSet, 
    value: number | undefined
  ) => {
    const updatedExercises = [...selectedExercises];
    updatedExercises[exerciseIndex].sets[setIndex] = {
      ...updatedExercises[exerciseIndex].sets[setIndex],
      [field]: value
    };
    setSelectedExercises(updatedExercises);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Workout</DialogTitle>
          <DialogDescription>
            Design your perfect workout routine. Add exercises, sets, and reps to track your progress.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workout-title" className="text-right">
                Title
              </Label>
              <Input
                id="workout-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                placeholder="Leg Day"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workout-category" className="text-right">
                Category
              </Label>
              <Select 
                value={category}
                onValueChange={setCategory}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select workout type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="flexibility">Flexibility</SelectItem>
                  <SelectItem value="balance">Balance</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="mt-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="exercises">Exercise Library</TabsTrigger>
                  <TabsTrigger value="selected">Selected Exercises ({selectedExercises.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="exercises" className="mt-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search exercises..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {filteredExercises.map((exercise) => (
                      <ExerciseItem
                        key={exercise.id}
                        exercise={exercise}
                        onSelect={handleSelectExercise}
                      />
                    ))}
                    {filteredExercises.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No exercises found matching your search
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="selected">
                  {selectedExercises.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No exercises selected yet.
                      <br />
                      Start by adding exercises from the Exercise Library.
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-[300px] overflow-y-auto py-2">
                      {selectedExercises.map((selectedEx, exIndex) => (
                        <div key={selectedEx.exercise.id} className="border rounded-md p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium text-base">{selectedEx.exercise.name}</h3>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRemoveExercise(selectedEx.exercise.id)}
                              className="h-8 px-2"
                            >
                              Remove
                            </Button>
                          </div>
                          
                          <div className="space-y-3 mt-3">
                            {selectedEx.sets.map((set, setIndex) => (
                              <div key={setIndex} className="flex flex-wrap items-center gap-2 p-2 bg-muted/40 rounded-md">
                                <div className="font-medium min-w-[80px]">Set {setIndex + 1}</div>
                                
                                {selectedEx.exercise.category === 'strength' && (
                                  <>
                                    <div className="flex items-center">
                                      <Label htmlFor={`reps-${exIndex}-${setIndex}`} className="mr-2 text-xs">
                                        Reps:
                                      </Label>
                                      <Input
                                        id={`reps-${exIndex}-${setIndex}`}
                                        type="number"
                                        min="1"
                                        className="h-8 w-16"
                                        value={set.reps || ''}
                                        onChange={(e) => updateSetValue(
                                          exIndex, 
                                          setIndex, 
                                          'reps', 
                                          e.target.value ? Number(e.target.value) : undefined
                                        )}
                                      />
                                    </div>
                                    <div className="flex items-center">
                                      <Label htmlFor={`weight-${exIndex}-${setIndex}`} className="mr-2 text-xs">
                                        Weight:
                                      </Label>
                                      <Input
                                        id={`weight-${exIndex}-${setIndex}`}
                                        type="number"
                                        min="0"
                                        step="2.5"
                                        className="h-8 w-16"
                                        value={set.weight || ''}
                                        onChange={(e) => updateSetValue(
                                          exIndex, 
                                          setIndex, 
                                          'weight', 
                                          e.target.value ? Number(e.target.value) : undefined
                                        )}
                                      />
                                    </div>
                                  </>
                                )}
                                
                                {(selectedEx.exercise.category === 'cardio' || 
                                 selectedEx.exercise.category === 'flexibility' ||
                                 selectedEx.exercise.category === 'balance') && (
                                  <div className="flex items-center">
                                    <Label htmlFor={`duration-${exIndex}-${setIndex}`} className="mr-2 text-xs">
                                      Duration (sec):
                                    </Label>
                                    <Input
                                      id={`duration-${exIndex}-${setIndex}`}
                                      type="number"
                                      min="1"
                                      className="h-8 w-16"
                                      value={set.duration || ''}
                                      onChange={(e) => updateSetValue(
                                        exIndex, 
                                        setIndex, 
                                        'duration', 
                                        e.target.value ? Number(e.target.value) : undefined
                                      )}
                                    />
                                  </div>
                                )}
                                
                                {selectedEx.exercise.category === 'cardio' && (
                                  <div className="flex items-center">
                                    <Label htmlFor={`distance-${exIndex}-${setIndex}`} className="mr-2 text-xs">
                                      Distance (m):
                                    </Label>
                                    <Input
                                      id={`distance-${exIndex}-${setIndex}`}
                                      type="number"
                                      min="0"
                                      step="100"
                                      className="h-8 w-20"
                                      value={set.distance || ''}
                                      onChange={(e) => updateSetValue(
                                        exIndex, 
                                        setIndex, 
                                        'distance', 
                                        e.target.value ? Number(e.target.value) : undefined
                                      )}
                                    />
                                  </div>
                                )}
                                
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 ml-auto"
                                  onClick={() => handleRemoveSet(exIndex, setIndex)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full flex items-center justify-center gap-1 mt-2"
                              onClick={() => handleAddSet(exIndex)}
                            >
                              <Plus className="h-4 w-4" /> Add Set
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-workout-blue hover:bg-blue-600"
              disabled={!title || !category || selectedExercises.length === 0}
            >
              Create Workout
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkoutModal;
