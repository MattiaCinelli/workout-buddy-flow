import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MUSCLE_REGIONS, type MuscleGroup, type MuscleRegionId } from '@/data/muscleGroups';
import { pruneRedundantRegionTags, regionTag } from '@/lib/muscleRegions';
import { cn } from '@/lib/utils';

interface MuscleTagPickerProps {
  groups: MuscleGroup[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

const chip = 'inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const chipOn = 'border-primary/40 bg-primary/15 text-primary';
const chipOff = 'border-border bg-transparent text-foreground hover:bg-muted';

// Compact two-level picker: only the five regions show until one is opened.
// Tapping a region selects the whole region and opens its muscles; ticking
// a muscle narrows it (the region tag is dropped, the muscle implies it).
// Tapping a selected region again opens it if closed, or clears it if open.
export const MuscleTagPicker = ({ groups, value, onChange, disabled }: MuscleTagPickerProps) => {
  const [openRegion, setOpenRegion] = useState<MuscleRegionId | null>(null);

  const musclesOf = (region: MuscleRegionId) => groups.filter(group => group.region === region);
  const pickedIn = (region: MuscleRegionId) => musclesOf(region).filter(group => value.includes(group.id)).length;
  const isActive = (region: MuscleRegionId) => value.includes(regionTag(region)) || pickedIn(region) > 0;

  const clickRegion = (region: MuscleRegionId) => {
    if (!isActive(region)) {
      onChange([...value, regionTag(region)]);
      setOpenRegion(region);
    } else if (openRegion !== region) {
      setOpenRegion(region);
    } else {
      const inRegion = new Set([regionTag(region), ...musclesOf(region).map(group => group.id)]);
      onChange(value.filter(tag => !inRegion.has(tag)));
      setOpenRegion(null);
    }
  };

  const toggleMuscle = (group: MuscleGroup) => {
    const next = value.includes(group.id)
      ? value.filter(tag => tag !== group.id)
      : [...value, group.id];
    // Unticking the last muscle keeps the region itself selected.
    if (group.region && value.includes(group.id) && !next.some(tag => musclesOf(group.region!).some(item => item.id === tag))) {
      next.push(regionTag(group.region));
    }
    onChange(pruneRedundantRegionTags(next, groups));
  };

  const others = groups.filter(group => !group.region);
  const open = openRegion ? musclesOf(openRegion) : [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {MUSCLE_REGIONS.map(region => {
          const count = pickedIn(region.id);
          return (
            <button key={region.id} type="button" disabled={disabled}
              aria-pressed={isActive(region.id)} aria-expanded={openRegion === region.id}
              onClick={() => clickRegion(region.id)}
              className={cn(chip, isActive(region.id) ? chipOn : chipOff, openRegion === region.id && 'ring-1 ring-primary/50')}>
              {region.name}{count > 0 && ` · ${count}`}
              <ChevronDown className={cn('h-3 w-3 opacity-60 transition-transform', openRegion === region.id && 'rotate-180')} aria-hidden="true" />
            </button>
          );
        })}
        {others.map(group => (
          <button key={group.id} type="button" disabled={disabled} aria-pressed={value.includes(group.id)}
            onClick={() => toggleMuscle(group)} className={cn(chip, value.includes(group.id) ? chipOn : chipOff)}>
            {group.name}
          </button>
        ))}
      </div>
      {openRegion && open.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-md border border-primary/20 bg-primary/[0.04] p-2" role="group"
          aria-label={`${MUSCLE_REGIONS.find(region => region.id === openRegion)?.name} muscles`}>
          {open.map(group => (
            <button key={group.id} type="button" disabled={disabled} aria-pressed={value.includes(group.id)}
              onClick={() => toggleMuscle(group)} className={cn(chip, 'h-7', value.includes(group.id) ? chipOn : chipOff)}>
              {group.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
