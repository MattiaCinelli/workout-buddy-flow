import { Measurement, MeasurementBetter, MeasurementKind } from '@/data/measurements';

export const KIND_LABEL: Record<MeasurementKind, string> = { length: 'Length', weight: 'Weight', time: 'Time' };

export const KIND_INPUT_HINT: Record<MeasurementKind, string> = {
  length: 'centimetres — use a minus for past the target (e.g. −5 = 5 cm past your toes)',
  weight: 'kilograms',
  time: 'seconds, or minutes:seconds (e.g. 1:30)',
};

/** A sensible starting direction; the user can always change it. */
export const defaultBetter = (kind: MeasurementKind): MeasurementBetter => (kind === 'length' ? 'lower' : 'higher');

const trimNumber = (value: number) => Number(value.toFixed(2));

export const formatMeasurementValue = (kind: MeasurementKind, value: number): string => {
  if (kind === 'length') return `${trimNumber(value)} cm`;
  if (kind === 'weight') return `${trimNumber(value)} kg`;
  if (value < 60) return `${trimNumber(value)} s`;
  const total = Math.round(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};

const NUMBER = /^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/;
const MINUS_SIGNS = /[−–]/g; // typographic minus / en dash, as typed on phones

const LIMITS: Record<MeasurementKind, { min: number; max: number }> = {
  length: { min: -1000, max: 100_000 },
  weight: { min: 0, max: 5000 },
  time: { min: 0, max: 24 * 3600 },
};

// Turns what the user typed into the stored base unit, or undefined if it
// isn't a usable value for this kind (empty, not a number, out of range).
export const parseMeasurementInput = (kind: MeasurementKind, raw: string): number | undefined => {
  const text = raw.trim().replace(MINUS_SIGNS, '-');
  if (!text) return undefined;

  let value: number;
  if (kind === 'time' && text.includes(':')) {
    const parts = text.split(':');
    if (parts.length > 3 || parts.some(part => !/^\d+([.,]\d+)?$/.test(part.trim()))) return undefined;
    const numbers = parts.map(part => Number(part.trim().replace(',', '.')));
    if (numbers.slice(1).some(part => part >= 60)) return undefined;
    value = numbers.reduce((total, part) => total * 60 + part, 0);
  } else {
    if (!NUMBER.test(text)) return undefined;
    value = Number(text.replace(',', '.'));
  }

  const { min, max } = LIMITS[kind];
  if (!Number.isFinite(value) || value < min || value > max) return undefined;
  return trimNumber(value);
};

const isBetter = (better: MeasurementBetter, candidate: number, than: number): boolean =>
  better === 'lower' ? candidate < than : candidate > than;

export interface MeasurementGroup {
  measurementId: string;
  // Name, description, kind and direction come from the most recent entry,
  // so editing them on one device wins over older entries elsewhere.
  name: string;
  description?: string;
  kind: MeasurementKind;
  better: MeasurementBetter;
  /** Oldest first. */
  entries: Measurement[];
  first: Measurement;
  latest: Measurement;
  /** The best value ever logged, in the direction this measurement improves. */
  best: Measurement;
  /** latest − previous entry; undefined with fewer than two entries. */
  change?: number;
  /** Whether that change moved in the better direction; undefined when unchanged. */
  improved?: boolean;
  /** The latest entry beats every earlier one. */
  isNewBest: boolean;
}

const byDateThenTime = (a: Measurement, b: Measurement) =>
  a.date.localeCompare(b.date)
  || (a.updatedAt ?? '').localeCompare(b.updatedAt ?? '')
  || a.id.localeCompare(b.id);

export const groupMeasurements = (measurements: Measurement[]): MeasurementGroup[] => {
  const byId = new Map<string, Measurement[]>();
  for (const entry of measurements) {
    byId.set(entry.measurementId, [...(byId.get(entry.measurementId) ?? []), entry]);
  }

  const groups: MeasurementGroup[] = [];
  for (const [measurementId, list] of byId) {
    const entries = [...list].sort(byDateThenTime);
    const latest = entries[entries.length - 1];
    const previous = entries[entries.length - 2];
    const { better } = latest;

    // Earliest entry to reach the best value keeps the record's date.
    const best = entries.reduce((winner, entry) => (isBetter(better, entry.value, winner.value) ? entry : winner));
    const change = previous ? trimNumber(latest.value - previous.value) : undefined;
    const earlier = entries.slice(0, -1);

    groups.push({
      measurementId,
      name: latest.name,
      description: latest.description,
      kind: latest.kind,
      better,
      entries,
      first: entries[0],
      latest,
      best,
      change,
      improved: change === undefined || change === 0 ? undefined : isBetter(better, latest.value, previous.value),
      isNewBest: earlier.length > 0 && earlier.every(entry => isBetter(better, latest.value, entry.value)),
    });
  }

  // Most recently logged first, so what you are working on is on top.
  return groups.sort((a, b) => b.latest.date.localeCompare(a.latest.date) || a.name.localeCompare(b.name));
};
