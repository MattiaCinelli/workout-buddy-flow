import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Exercise, getLogType, DEFAULT_SECONDS_PER_REP } from '@/data/exercises';
import { Trash, FileImage, Loader2, Settings2 } from 'lucide-react';
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { readFileAsDataUrl, resizeImageToDataUrl } from '@/lib/image';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';

const optionalNumber = (label: string, min: number, max: number) => z.string().optional().refine(value => {
  if (!value?.trim()) return true;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}, `${label} must be between ${min} and ${max}.`);

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Exercise name must be at least 2 characters.",
  }),
  category: z.enum(['strength', 'cardio', 'flexibility', 'balance']),
  muscleGroups: z.array(z.string()).default([]),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  logType: z.enum(['reps', 'time']),
  unilateral: z.boolean().default(false),
  defaultSets: optionalNumber('Sets', 1, 100),
  defaultReps: optionalNumber('Reps', 0, 1000),
  defaultDuration: optionalNumber('Duration', 0, 86400),
  defaultWeight: optionalNumber('Weight', 0, 1000),
  defaultDistance: optionalNumber('Distance', 0, 1000000),
  secondsPerRep: optionalNumber('Seconds per rep', 1, 60),
  instructions: z.string().optional(),
  imageUrl: z.string().optional(),
});

const toNumber = (value?: string) => (value && value.trim() ? Number(value) : undefined);

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
  const [showAdvanced, setShowAdvanced] = useState(!!exercise?.secondsPerRep);
  const { muscleGroups: availableMuscleGroups } = useData();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: exercise?.name || "",
      category: exercise?.category || 'strength',
      muscleGroups: exercise?.muscleGroups || [],
      difficulty: exercise?.difficulty || 'beginner',
      logType: exercise ? getLogType(exercise) : 'reps',
      unilateral: exercise?.unilateral ?? false,
      defaultSets: exercise?.defaultSets?.toString() ?? '3',
      defaultReps: exercise?.defaultReps?.toString() ?? '',
      defaultDuration: exercise?.defaultDuration?.toString() ?? '',
      defaultWeight: exercise?.defaultWeight?.toString() ?? '',
      defaultDistance: exercise?.defaultDistance?.toString() ?? '',
      secondsPerRep: exercise?.secondsPerRep?.toString() ?? '',
      instructions: exercise?.instructions || "",
      imageUrl: exercise?.imageUrl || "",
    },
  });

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      name: values.name,
      category: values.category,
      muscleGroups: values.muscleGroups,
      difficulty: values.difficulty,
      logType: values.logType,
      unilateral: values.unilateral || undefined,
      defaultSets: toNumber(values.defaultSets),
      defaultReps: values.logType === 'reps' ? toNumber(values.defaultReps) : undefined,
      defaultDuration: values.logType === 'time' ? toNumber(values.defaultDuration) : undefined,
      defaultWeight: toNumber(values.defaultWeight),
      defaultDistance: toNumber(values.defaultDistance),
      secondsPerRep: values.logType === 'reps' ? toNumber(values.secondsPerRep) : undefined,
      instructions: values.instructions || undefined,
      imageUrl: values.imageUrl,
    });
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // A hard ceiling on what we'll even attempt to decode, independent of
    // the IndexedDB-friendly limit below — just a guard against asking the
    // browser to load something absurd.
    if (file.size > 25 * 1024 * 1024) {
      toast.error('Image is too large to process (max 25MB).');
      return;
    }

    const isGif = file.type === 'image/gif';
    const MAX_STORED_BYTES = 5 * 1024 * 1024;

    // GIFs are stored exactly as uploaded (no resizing, to keep the
    // animation), so the raw upload size IS what ends up in IndexedDB —
    // check it up front. Everything else gets downscaled and re-encoded as
    // JPEG first (below), which routinely shrinks a multi-MB file to a few
    // hundred KB — checking the raw upload size before that would reject a
    // perfectly fine photo just because PNG happens to compress far worse
    // than JPEG for the same image (a PNG can be 3-4x the JPEG's size for
    // identical visual content).
    if (isGif && file.size > MAX_STORED_BYTES) {
      toast.error("GIFs must be under 5MB — they're stored as uploaded, unlike other images.");
      return;
    }

    setIsProcessingImage(true);
    try {
      // GIFs go through as-is so animation is preserved; canvas resizing
      // would flatten them to a single frame. Static images are downscaled
      // so a full-resolution phone photo isn't stored verbatim for what
      // only ever renders as a thumbnail.
      const dataUrl = isGif ? await readFileAsDataUrl(file) : await resizeImageToDataUrl(file);

      // Base64 inflates size by ~4/3 — compare against the equivalent
      // binary threshold. In practice a resized 800px JPEG never gets
      // remotely close to this; it's a defensive check, not the normal path.
      if (!isGif && dataUrl.length > MAX_STORED_BYTES * 4 / 3) {
        toast.error('This image is still too large after compression. Try a different file.');
        return;
      }

      form.setValue('imageUrl', dataUrl);
    } catch (error) {
      console.error('Failed to process image:', error);
      toast.error('Could not read that image. Try a different file.');
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

  const logType = form.watch('logType');

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

        <FormField
          control={form.control}
          name="muscleGroups"
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <FormLabel>Muscle Groups (optional)</FormLabel>
              <FormControl>
                <ToggleGroup
                  type="multiple"
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                  className="justify-start flex-wrap"
                  disabled={isSubmitting}
                >
                  {availableMuscleGroups.map((group) => (
                    <ToggleGroupItem key={group.id} value={group.id} aria-label={group.name} className="h-8 px-2.5 text-xs">
                      {group.name}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FormControl>
            </FormItem>
          )}
        />

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

        <FormField
          control={form.control}
          name="logType"
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <FormLabel>Logged as</FormLabel>
              <FormControl>
                <ToggleGroup
                  type="single"
                  value={field.value}
                  onValueChange={(value) => value && field.onChange(value)}
                  className="justify-start"
                  disabled={isSubmitting}
                >
                  <ToggleGroupItem value="reps" className="px-4">Reps (e.g. push-ups)</ToggleGroupItem>
                  <ToggleGroupItem value="time" className="px-4">Time (e.g. a plank hold)</ToggleGroupItem>
                </ToggleGroup>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unilateral"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="space-y-0.5">
                <FormLabel>One limb at a time</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Splits every set into a left side, then a right side, with a short switch pause between.
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/40 p-3">
          <div className="col-span-2 text-xs text-muted-foreground -mt-0.5 mb-1">
            Pre-filled whenever you add this exercise to a workout — still editable there per set.
          </div>
          <div className="space-y-1">
            <label htmlFor="defaultSets" className="text-xs text-muted-foreground">Default sets</label>
            <Input id="defaultSets" type="number" min="1" max="100" className="bg-background" {...form.register("defaultSets")} disabled={isSubmitting} />
          </div>
          {logType === 'reps' ? (
            <div className="space-y-1">
              <label htmlFor="defaultReps" className="text-xs text-muted-foreground">Default reps</label>
              <Input id="defaultReps" type="number" min="0" max="1000" className="bg-background" {...form.register("defaultReps")} disabled={isSubmitting} />
            </div>
          ) : (
            <div className="space-y-1">
              <label htmlFor="defaultDuration" className="text-xs text-muted-foreground">Default duration (sec)</label>
              <Input id="defaultDuration" type="number" min="0" max="86400" className="bg-background" {...form.register("defaultDuration")} disabled={isSubmitting} />
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="defaultWeight" className="text-xs text-muted-foreground">Default weight in kilograms (optional)</label>
            <Input id="defaultWeight" type="number" min="0" max="1000" step="0.5" className="bg-background" {...form.register("defaultWeight")} disabled={isSubmitting} />
          </div>
          <div className="space-y-1">
            <label htmlFor="defaultDistance" className="text-xs text-muted-foreground">Default distance in meters (optional)</label>
            <Input id="defaultDistance" type="number" min="0" max="1000000" className="bg-background" {...form.register("defaultDistance")} disabled={isSubmitting} />
          </div>

          {logType === 'reps' && (
            <div className="col-span-2">
              {!showAdvanced ? (
                <Button
                  type="button" variant="ghost" size="sm" className="h-7 text-xs px-2 -ml-2"
                  onClick={() => setShowAdvanced(true)}
                >
                  <Settings2 className="h-3.5 w-3.5 mr-1" /> Advanced
                </Button>
              ) : (
                <div className="space-y-1 pt-1">
                  <label htmlFor="secondsPerRep" className="text-xs text-muted-foreground">
                    Seconds per rep — paces the countdown during a workout (default {DEFAULT_SECONDS_PER_REP}s)
                  </label>
                  <Input
                    id="secondsPerRep" type="number" min="1" max="60" className="bg-background w-32"
                    placeholder={String(DEFAULT_SECONDS_PER_REP)}
                    {...form.register("secondsPerRep")} disabled={isSubmitting}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {Object.values(form.formState.errors).length > 0 && (
          <div className="text-sm text-destructive" role="alert">
            {Object.values(form.formState.errors).map((error, index) =>
              error?.message ? <p key={index}>{String(error.message)}</p> : null
            )}
          </div>
        )}

        <div className="grid gap-2">
          <label htmlFor="instructions" className="text-right inline-block w-32 pr-2">
            Instructions (optional)
          </label>
          <Textarea
            id="instructions"
            placeholder="How to perform this exercise — form cues, setup, what to watch out for…"
            rows={3}
            {...form.register("instructions")}
            disabled={isSubmitting}
          />
        </div>

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
