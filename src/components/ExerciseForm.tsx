
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Exercise } from '@/data/exercises';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { ImagePlus, Trash2 } from 'lucide-react';

interface ExerciseFormProps {
  exercise?: Exercise;
  onSubmit: (exercise: Omit<Exercise, 'id'>) => void;
  onCancel: () => void;
}

const ExerciseForm: React.FC<ExerciseFormProps> = ({ exercise, onSubmit, onCancel }) => {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(exercise?.imageUrl || null);
  const [muscleGroups, setMuscleGroups] = useState<string>(exercise?.muscleGroups.join(', ') || '');
  
  const form = useForm({
    defaultValues: {
      name: exercise?.name || '',
      category: exercise?.category || 'strength',
      difficulty: exercise?.difficulty || 'beginner',
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = (values: any) => {
    const muscleGroupsArray = muscleGroups
      .split(',')
      .map(group => group.trim())
      .filter(group => group.length > 0);
    
    onSubmit({
      name: values.name,
      category: values.category as Exercise['category'],
      difficulty: values.difficulty as Exercise['difficulty'],
      muscleGroups: muscleGroupsArray,
      imageUrl: imagePreview || undefined,
    });
  };

  const removeImage = () => {
    setImagePreview(null);
  };

  return (
    <div className="space-y-6 p-1">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Exercise name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select exercise category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="flexibility">Flexibility</SelectItem>
                    <SelectItem value="balance">Balance</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Difficulty</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label htmlFor="muscleGroups">Muscle Groups</Label>
            <Input 
              id="muscleGroups"
              placeholder="Chest, Biceps, etc. (comma separated)"
              value={muscleGroups}
              onChange={(e) => setMuscleGroups(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Exercise Image</Label>
            {imagePreview ? (
              <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden">
                <img 
                  src={imagePreview} 
                  alt="Exercise preview" 
                  className="w-full h-full object-contain"
                />
                <Button 
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImagePlus className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG or GIF</p>
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-workout-blue hover:bg-blue-600">
              {exercise ? 'Update Exercise' : 'Create Exercise'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ExerciseForm;
