// Standard kilogram plates found in most gyms, heaviest first.
export const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

// Common barbell weights: Olympic, women's Olympic, training bar, technique bar.
export const BAR_OPTIONS = [20, 15, 10, 7] as const;

export interface PlateBreakdown {
  /** Plates to load on ONE side of the bar, heaviest first. */
  perSide: number[];
  /** Weight per side that no combination of available plates can make (0 when exact). */
  leftoverPerSide: number;
  barWeight: number;
  /** What the bar actually weighs once `perSide` is loaded on both ends. */
  achievable: number;
}

export const platesPerSide = (
  target: number,
  barWeight: number,
  plates: readonly number[] = KG_PLATES,
): PlateBreakdown => {
  const perSideTarget = Math.max(0, (target - barWeight) / 2);
  const perSide: number[] = [];
  let remaining = perSideTarget;

  for (const plate of [...plates].sort((a, b) => b - a)) {
    while (remaining >= plate - 1e-9) {
      perSide.push(plate);
      remaining -= plate;
    }
  }

  const loadedPerSide = perSide.reduce((sum, plate) => sum + plate, 0);
  return {
    perSide,
    leftoverPerSide: Number(remaining.toFixed(2)),
    barWeight,
    achievable: Number((barWeight + loadedPerSide * 2).toFixed(2)),
  };
};

// "25 + 15" style summary of one side.
export const describePerSide = (perSide: number[]): string =>
  perSide.length ? perSide.join(' + ') : 'empty bar';
