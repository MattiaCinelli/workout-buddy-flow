import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Exercise } from '@/data/exercises';
import { Trash, FileImage, Loader2 } from 'lucide-react';
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
import { readFileAsDataUrl, resizeImageToDataUrl } from '@/lib/image';

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
  isSubmitting?: boolean;
}

const ExerciseForm: React.FC<ExerciseFormProps> = ({
  exercise,
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

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

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB for IndexedDB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setIsProcessingImage(true);
    try {
      // GIFs go through as-is so animation is preserved; canvas resizing
      // would flatten them to a single frame. Static images are downscaled
      // so a full-resolution phone photo isn't stored verbatim for what
      // only ever renders as a thumbnail.
      const dataUrl = file.type === 'image/gif'
        ? await readFileAsDataUrl(file)
        : await resizeImageToDataUrl(file);
      form.setValue('imageUrl', dataUrl);
    } catch (error) {
      console.error('Failed to process image:', error);
      alert('Could not read that image. Try a different file.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleRemoveImage = () => {
    form.setValue('imageUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid gap-2">
          <label htmlFor="name" className="text-right inline-block w-32 pr-2">
            Exercise Name
          </label>
          <Input 
            id="name" 
            placeholder="Exercise Name" 
            {...form.register("name")} 
            disabled={isSubmitting}
          />
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
                disabled={isSubmitting}
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
          <Input 
            id="muscleGroups" 
            placeholder="Muscle Groups (comma separated)" 
            {...form.register("muscleGroups")} 
            disabled={isSubmitting}
          />
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
                disabled={isSubmitting}
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
            Image / GIF
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              disabled={isSubmitting || isProcessingImage}
            >
              {isProcessingImage ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileImage className="h-4 w-4 mr-2" />
              )}
              {isProcessingImage ? 'Processing…' : 'Choose Image'}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*,.gif"
              className="hidden"
            />
          </div>
          {form.watch('imageUrl') && (
            <div className="relative mt-2">
              <img
                src={form.watch('imageUrl')}
                alt="Selected exercise"
                className="max-h-40 object-contain rounded-md"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1"
                onClick={handleRemoveImage}
                disabled={isSubmitting}
              >
                Remove
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Supports images and GIFs (max 5MB). Images are stored locally on your device.
          </p>
        </div>
        
        <div className="flex justify-between items-center mt-6">
          <div>
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                className="mr-2"
                disabled={isSubmitting}
              >
                <Trash className="h-4 w-4 mr-1" />
                Delete Exercise
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {exercise ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                exercise ? 'Update' : 'Create'
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default ExerciseForm;
