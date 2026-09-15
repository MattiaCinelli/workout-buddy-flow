import { ReactNode, useState } from 'react';
import { ChevronDown, Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CardStackProps {
  front: ReactNode;
  children: ReactNode;
  count: number;
  label: string;
  forceExpanded?: boolean;
  className?: string;
  itemsClassName?: string;
}

const CardStack = ({ front, children, count, label, forceExpanded = false, className, itemsClassName }: CardStackProps) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded || forceExpanded;
  if (count < 1) return <>{front}</>;

  return <div className={cn('relative pb-2 pl-1', className)} data-card-stack>
    <div className="absolute inset-x-3 bottom-1 top-2 -z-10 rounded-lg border bg-card/70" />
    <div className="absolute inset-x-1.5 bottom-0 top-4 -z-20 rounded-lg border bg-card/40" />
    {front}
    <Button type="button" variant="secondary" size="sm" className="mt-2 h-8" aria-expanded={visible} onClick={() => setExpanded(value => !value)}>
      <Layers3 className="mr-1 h-3.5 w-3.5" />
      {count} {label}{count === 1 ? '' : 's'}
      <ChevronDown className={cn('ml-1 h-3.5 w-3.5 transition-transform', visible && 'rotate-180')} />
    </Button>
    {visible && <div className={cn('ml-4 mt-2 space-y-2 border-l-2 border-primary/20 pl-3', itemsClassName)}>{children}</div>}
  </div>;
};

export default CardStack;
