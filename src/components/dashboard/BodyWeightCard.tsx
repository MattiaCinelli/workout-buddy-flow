import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Scale } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';

const todayStr = () => new Date().toISOString().split('T')[0];

export function BodyWeightCard() {
  const { bodyMetrics, createBodyMetric, deleteBodyMetric } = useData();
  const [date, setDate] = useState(todayStr);
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const chartData = useMemo(() =>
    bodyMetrics.map(m => ({ date: format(parseISO(m.date), 'MMM d'), weight: m.weight })),
  [bodyMetrics]);

  const handleLog = async () => {
    const parsedWeight = Number(weight);
    if (!date || !weight || Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      toast.error('Enter a valid date and weight.');
      return;
    }
    setSaving(true);
    try {
      await createBodyMetric({ date, weight: parsedWeight, notes: notes.trim() || undefined });
      toast.success('Weight logged');
      setWeight('');
      setNotes('');
    } catch (error) {
      console.error('Failed to log body weight:', error);
      toast.error('Could not log weight. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBodyMetric(id);
    } catch (error) {
      console.error('Failed to delete body weight entry:', error);
      toast.error('Could not delete that entry.');
    }
  };

  // bodyMetrics is sorted oldest-first by the hook, so the last two entries
  // are the latest and the one before it.
  const latest = bodyMetrics[bodyMetrics.length - 1];
  const previous = bodyMetrics[bodyMetrics.length - 2];
  const change = latest && previous ? latest.weight - previous.weight : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" />Body Weight</CardTitle>
        <CardDescription>Track your weight over time, independent of workout performance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="bw-date">Date</Label>
            <Input id="bw-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" disabled={saving} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bw-weight">Weight (kg)</Label>
            <Input
              id="bw-weight" type="number" min="0" max="500" step="0.1" className="w-28"
              value={weight} onChange={e => setWeight(e.target.value)} disabled={saving}
            />
          </div>
          <div className="space-y-1 flex-1 min-w-[160px]">
            <Label htmlFor="bw-notes">Notes (optional)</Label>
            <Input id="bw-notes" value={notes} onChange={e => setNotes(e.target.value)} disabled={saving} placeholder="e.g. after a big meal" />
          </div>
          <Button onClick={handleLog} disabled={saving || !date || !weight}>Log</Button>
        </div>

        {latest && (
          <p className="text-sm text-muted-foreground">
            Latest: <span className="font-medium text-foreground">{latest.weight} kg</span> on {format(parseISO(latest.date), 'MMM d, yyyy')}
            {change !== undefined && change !== 0 && (
              <span className={change > 0 ? 'text-destructive' : 'text-accent'}>
                {' '}({change > 0 ? '+' : ''}{change.toFixed(1)} kg since last entry)
              </span>
            )}
          </p>
        )}

        {bodyMetrics.length >= 2 ? (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" unit="kg" domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => [`${value} kg`, 'Weight']}
                />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : bodyMetrics.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No entries yet — log your weight above to start tracking.</p>
        ) : null}

        {bodyMetrics.length > 0 && (
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {[...bodyMetrics].reverse().map(metric => (
              <li key={metric.id} className="flex items-center justify-between text-sm rounded-md border px-3 py-1.5">
                <span>{format(parseISO(metric.date), 'MMM d, yyyy')} — {metric.weight} kg{metric.notes ? ` · ${metric.notes}` : ''}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(metric.id)} aria-label="Delete entry">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
