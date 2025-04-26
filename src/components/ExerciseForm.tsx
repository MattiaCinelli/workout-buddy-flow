import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Exercise } from '@/data/exercises';
import { Trash, FileImage } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Exercise name must be at least 2 characters.",
  }),
  category: z.enum(['strength', 'cardio', 'flexibility', 'balance']),
  muscleGroups: z.string().optional(),
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      muscleGroups: values.muscleGroups ? values.muscleGroups.split(',').map(group => group.trim()) : [],
      difficulty: values.difficulty,
      imageUrl: values.imageUrl,
    });
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('imageUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid gap-2">
          <label htmlFor="name" className="text-right inline-block w-32 pr-2">
            Exercise Name
          </label>
          <Input id="name" placeholder="Exercise Name" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
          )}
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <FormLabel className="text-right inline-block w-32 pr-2">
                Category
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
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

        <div className="grid gap-2">
          <label htmlFor="muscleGroups" className="text-right inline-block w-32 pr-2">
            Muscle Groups (optional)
          </label>
          <Input id="muscleGroups" placeholder="Muscle Groups (comma separated)" {...form.register("muscleGroups")} />
        </div>

        <FormField
          control={form.control}
          name="difficulty"
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <FormLabel className="text-right inline-block w-32 pr-2">
                Difficulty
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
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

        <div className="grid gap-2">
          <label htmlFor="imageUrl" className="text-right inline-block w-32 pr-2">
            Image
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <FileImage className="h-4 w-4 mr-2" />
              Choose Image
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          {form.watch('imageUrl') && (
            <img
              src={form.watch('imageUrl')}
              alt="Selected exercise"
              className="mt-2 max-h-40 object-contain rounded-md"
            />
          )}
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
