import { useEffect, useMemo, useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BAR_OPTIONS, describePerSide, platesPerSide } from '@/lib/plateMath';

const BAR_PREF_KEY = 'workout-buddy-bar-weight';

const readBarPref = (): number => {
  try {
    const stored = Number(localStorage.getItem(BAR_PREF_KEY));
    return BAR_OPTIONS.includes(stored as typeof BAR_OPTIONS[number]) ? stored : 20;
  } catch {
    return 20;
  }
};

interface Props {
  /** Pre-fills the target weight — e.g. the current set's working weight. */
  initialWeight?: number;
  triggerLabel?: string;
  triggerClassName?: string;
}

// A barbell loading helper: given a target weight and the bar, what plates
// go on each side. Bar choice is remembered across sessions.
export const PlateCalculator = ({ initialWeight, triggerLabel = 'Plates', triggerClassName }: Props) => {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState(initialWeight ? String(initialWeight) : '');
  const [bar, setBar] = useState(readBarPref);

  useEffect(() => {
    if (open && initialWeight !== undefined) setWeight(String(initialWeight));
  }, [open, initialWeight]);

  const setBarPref = (next: number) => {
    setBar(next);
    try { localStorage.setItem(BAR_PREF_KEY, String(next)); } catch { /* private mode */ }
  };

  const target = Number(weight);
  const breakdown = useMemo(
    () => (Number.isFinite(target) && target > 0 ? platesPerSide(target, bar) : null),
    [target, bar],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={triggerClassName}>
          <Dumbbell className="mr-2 h-4 w-4" />{triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Plate calculator</DialogTitle>
          <DialogDescription>Plates to load on each side of the bar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="plate-target">Target weight (kg)</Label>
            <Input id="plate-target" type="number" min="0" step="0.5" inputMode="decimal"
              value={weight} onChange={e => setWeight(e.target.value)} autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label>Bar</Label>
            <div className="flex flex-wrap gap-2">
              {BAR_OPTIONS.map(option => (
                <Button key={option} type="button" size="sm"
                  variant={bar === option ? 'default' : 'outline'}
                  onClick={() => setBarPref(option)}>
                  {option} kg
                </Button>
              ))}
            </div>
          </div>

          {breakdown && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="text-lg font-semibold">
                Per side: {describePerSide(breakdown.perSide)}
              </p>
              {breakdown.perSide.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {breakdown.perSide.map((plate, index) => (
                    <span key={index} className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                      {plate}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Bar {breakdown.barWeight} kg + plates = {breakdown.achievable} kg
                {breakdown.leftoverPerSide > 0 && (
                  <> · {(breakdown.leftoverPerSide * 2).toFixed(2)} kg short of target</>
                )}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlateCalculator;
