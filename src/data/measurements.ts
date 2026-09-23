export type MeasurementKind = 'length' | 'weight' | 'time';

// Which direction is an improvement. A toe-touch gap or a 5 km time gets
// better as it shrinks; a plank hold or a lift gets better as it grows.
export type MeasurementBetter = 'higher' | 'lower';

// One logged value of something the user measures themselves ("Toe touch
// gap", "Plank hold", "Front squat 1RM"). Each value is its own record so two
// devices logging values never overwrite each other; entries of the same
// thing share `measurementId`, and the name/description/kind/better are
// repeated on each entry (edited together — see the measurements card).
export interface Measurement {
  id: string;
  /** Groups every logged value of the same thing. */
  measurementId: string;
  name: string;
  description?: string;
  kind: MeasurementKind;
  better: MeasurementBetter;
  /** Stored in the base unit: centimetres, kilograms, or seconds. Length may be negative (e.g. reaching past your toes). */
  value: number;
  date: string; // ISO date (YYYY-MM-DD)
  notes?: string;
  updatedAt?: string; // stamped by useIndexedDBCollection; used as the sync watermark
  deletedAt?: string; // sync tombstone — see BodyMetric
}

export const defaultMeasurements: Measurement[] = [];
