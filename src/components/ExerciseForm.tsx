import React from 'react';
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Exercise } from '@/data/exercises';
import { Trash } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Exercise name must be at least 2 characters.",
  }),
  category: z.enum(['strength', 'cardio', 'flexibility', 'balance']),
  muscleGroups: z.string().min(2, {
    message: "Muscle groups must be at least 2 characters.",
  }),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  imageUrl: z.string().optional(),
});

interface ExerciseFormProps {
  exercise?: Exercise;
  onSubmit: (data: Omit<Exercise, 'id'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const ExerciseForm: React.FC<ExerciseFormProps> = ({
  exercise,
  onSubmit,
  onCancel,
  onDelete
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: exercise?.name || "",
      category: exercise?.category || 'strength',
      muscleGroups: exercise?.muscleGroups?.join(', ') || "",
      difficulty: exercise?.difficulty || 'beginner',
      imageUrl: exercise?.imageUrl || "",
    },
  });

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      name: values.name,
      category: values.category,
      muscleGroups: values.muscleGroups.split(',').map(group => group.trim()),
      difficulty: values.difficulty,
      imageUrl: values.imageUrl,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid gap-2">
          <label htmlFor="name" className="text-right inline-block w-32 pr-2">
            Exercise Name
          </label>
          <Input id="name" placeholder="Exercise Name" {...form.register("name")} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="category" className="text-right inline-block w-32 pr-2">
            Category
          </label>
          <Select {...form.register("category")} id="category">
            <option value="strength">Strength</option>
            <option value="cardio">Cardio</option>
            <option value="flexibility">Flexibility</option>
            <option value="balance">Balance</option>
          </Select>
        </div>
        <div className="grid gap-2">
          <label htmlFor="muscleGroups" className="text-right inline-block w-32 pr-2">
            Muscle Groups
          </label>
          <Input id="muscleGroups" placeholder="Muscle Groups (comma separated)" {...form.register("muscleGroups")} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="difficulty" className="text-right inline-block w-32 pr-2">
            Difficulty
          </label>
          <Select {...form.register("difficulty")} id="difficulty">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
        </div>
        <div className="grid gap-2">
          <label htmlFor="imageUrl" className="text-right inline-block w-32 pr-2">
            Image URL
          </label>
          <Input id="imageUrl" placeholder="Image URL" {...form.register("imageUrl")} />
        </div>
        
        <div className="flex justify-between items-center mt-6">
          <div>
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                className="mr-2"
              >
                <Trash className="h-4 w-4 mr-1" />
                Delete Exercise
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">{exercise ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default ExerciseForm;
