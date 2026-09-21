import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';

/** Dedicated long-press reorder handle for phones. It deliberately lives on
 * a handle rather than the whole card so scrolling and editing fields remain
 * normal. Keyboard users retain the adjacent move-up/down buttons. */
export const useTouchReorder = <T,>(
  items: T[],
  setItems: (items: T[]) => void,
  getId: (item: T) => string,
) => {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const timer = useRef<number | undefined>(undefined);
  const activeId = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const stop = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = undefined;
    activeId.current = null;
    setDraggingId(null);
  };
  useEffect(() => stop, []);

  const bind = (id: string) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'touch') return;
      timer.current = window.setTimeout(() => {
        activeId.current = id;
        setDraggingId(id);
        navigator.vibrate?.(20);
      }, 400);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      const sourceId = activeId.current;
      if (!sourceId) return;
      event.preventDefault();
      const target = document.elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-reorder-id]')?.dataset.reorderId;
      if (!target || target === sourceId) return;
      const next = [...itemsRef.current];
      const from = next.findIndex(item => getId(item) === sourceId);
      const to = next.findIndex(item => getId(item) === target);
      if (from < 0 || to < 0) return;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      itemsRef.current = next;
      setItems(next);
    },
    onPointerUp: stop,
    onPointerCancel: stop,
  });

  return { bind, draggingId };
};
