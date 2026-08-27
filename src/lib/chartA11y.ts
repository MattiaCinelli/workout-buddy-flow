// A one-line text summary of a chart series, for `role="img"` +
// `aria-label` on chart containers (a Recharts SVG is otherwise opaque to
// assistive tech). Pages that also render the underlying numbers as text
// give the full detail; this is the at-a-glance equivalent.
export const describeSeries = (
  label: string,
  values: Array<number | undefined | null>,
  unit: string,
): string => {
  const nums = values.filter((value): value is number => typeof value === 'number');
  if (nums.length === 0) return `${label}: no data yet.`;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const latest = nums[nums.length - 1];
  const spread = min === max ? `${min} ${unit}` : `${min} to ${max} ${unit}`;
  return `${label}: ${nums.length} point${nums.length === 1 ? '' : 's'}, ${spread}, most recent ${latest} ${unit}.`;
};
