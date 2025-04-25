
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
import { Search } from 'lucide-react';

interface CreateWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateWorkoutModal: React.FC<CreateWorkoutModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
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
      description: `"${title}" has been created.`,
    });
    
    // Reset form and close modal
    setTitle('');
    setCategory('');
    setSearchQuery('');
    onClose();
  };
  
  const handleSelectExercise = (exercise: Exercise) => {
    toast({
      title: "Exercise added",
      description: `${exercise.name} added to workout.`,
    });
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
              <Tabs defaultValue="exercises">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="exercises">Exercise Library</TabsTrigger>
                  <TabsTrigger value="selected">Selected Exercises</TabsTrigger>
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
                  <div className="py-8 text-center text-muted-foreground">
                    No exercises selected yet.
                    <br />
                    Start by adding exercises from the Exercise Library.
                  </div>
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
              disabled={!title || !category}
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
