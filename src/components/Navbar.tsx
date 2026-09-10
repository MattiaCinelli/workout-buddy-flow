import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dumbbell, Home, Menu, Library, Calendar, History, ListChecks, TrendingUp, BookOpen, Settings } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import { AccountButton } from "@/components/AccountButton";
import { RemindersDialog, RemindersTriggerButton } from "@/components/RemindersButton";
import { cn } from '@/lib/utils';

// How far from the left edge a touch has to start, and how far it has to
// travel right, to count as "open the drawer" rather than an ordinary
// scroll or a tap near the edge. Mirrors the edge-swipe affordance most
// native apps use for a hidden side drawer.
const EDGE_ZONE_PX = 24;
const OPEN_SWIPE_PX = 60;
const CLOSE_SWIPE_PX = 60;
const MAX_VERTICAL_DRIFT_PX = 60;

const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path
    || (path !== '/' && location.pathname.startsWith(`${path}/`));

  const goTo = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  // Swipe from the screen's left edge to reveal the drawer, without a
  // visible handle sitting on screen the rest of the time — this listens
  // globally (rather than on some fixed strip of markup) because the open
  // gesture has to work no matter what's currently on screen underneath it.
  useEffect(() => {
    let startX: number | null = null;
    let startY: number | null = null;

    const onTouchStart = (event: TouchEvent) => {
      if (mobileMenuOpen || window.innerWidth >= 768) { startX = null; return; }
      const touch = event.touches[0];
      if (touch.clientX <= EDGE_ZONE_PX) {
        startX = touch.clientX;
        startY = touch.clientY;
      } else {
        startX = null;
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (startX === null) return;
      const touch = event.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - (startY ?? touch.clientY));
      if (deltaX > OPEN_SWIPE_PX && deltaY < MAX_VERTICAL_DRIFT_PX) {
        setMobileMenuOpen(true);
        startX = null;
      }
    };

    const reset = () => { startX = null; startY = null; };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', reset, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', reset);
    };
  }, [mobileMenuOpen]);

  // Swiping the open drawer itself back to the left closes it — the
  // counterpart gesture to opening it, scoped to just the panel (tapping
  // the overlay or a link already closes it via Sheet's own behavior).
  const closeSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const onPanelTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    closeSwipeStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onPanelTouchMove = (event: React.TouchEvent) => {
    if (!closeSwipeStart.current) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - closeSwipeStart.current.x;
    const deltaY = Math.abs(touch.clientY - closeSwipeStart.current.y);
    if (deltaX < -CLOSE_SWIPE_PX && deltaY < MAX_VERTICAL_DRIFT_PX) {
      setMobileMenuOpen(false);
      closeSwipeStart.current = null;
    }
  };

  const navLinks: { path: string; label: string; icon: React.ReactNode }[] = [
    { path: '/', label: 'Dashboard', icon: <Home className="h-4 w-4" /> },
    { path: '/workouts', label: 'Workouts', icon: <ListChecks className="h-4 w-4" /> },
    { path: '/exercises', label: 'Exercises', icon: <Library className="h-4 w-4" /> },
    { path: '/calendar', label: 'Calendar', icon: <Calendar className="h-4 w-4" /> },
    { path: '/history', label: 'History', icon: <History className="h-4 w-4" /> },
    { path: '/progress', label: 'Progress', icon: <TrendingUp className="h-4 w-4" /> },
    { path: '/courses', label: 'Courses', icon: <BookOpen className="h-4 w-4" /> },
    { path: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <nav className="lcars-nav sticky top-0 z-40 bg-card px-4 md:px-6" aria-label="Primary navigation">
      <div className="lcars-top-rail" aria-hidden="true">
        <span /><span /><span>WORKOUT BUDDY</span>
      </div>
      <div className="container mx-auto flex items-center justify-between gap-3">
        <div className="flex shrink-0 items-center gap-1">
          {/* Menu sits before the logo, mobile only — thumb-reachable on
              the left edge, next to the left-edge open-swipe zone. */}
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 md:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <button
            type="button"
            className="group flex shrink-0 cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left"
            onClick={() => navigate('/')}
            aria-label="Workout Buddy home"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-3">
              <Dumbbell className="h-5 w-5" />
            </span>
            <span className="text-base font-bold tracking-tight text-foreground sm:text-lg">
              Workout<span className="text-primary">Buddy</span>
            </span>
          </button>
        </div>

        {/* Desktop navigation */}
        <div className="hidden min-w-0 items-center gap-1 md:flex">
          {navLinks.map(link => (
            <Button
              key={link.path}
              variant="ghost"
              size="sm"
              className={cn(
                'h-9 px-2.5 text-muted-foreground hover:text-foreground min-[1360px]:px-3',
                isActive(link.path) && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
              )}
              onClick={() => navigate(link.path)}
              aria-label={link.label}
              aria-current={isActive(link.path) ? 'page' : undefined}
            >
              {link.icon}
              <span className="hidden min-[1360px]:inline">{link.label}</span>
            </Button>
          ))}

          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <RemindersTriggerButton onClick={() => setRemindersOpen(true)} />
          <AccountButton />
        </div>

        {/* Mobile top bar — menu lives on the left, next to the logo */}
        <div className="md:hidden flex items-center gap-1">
          <AccountButton />
        </div>
      </div>

      <div className="lcars-bottom-rail" aria-hidden="true"><span /><span>LCARS 47</span></div>

      {/* Mobile navigation drawer — opens via the button above or by
          swiping right from the screen's left edge; closes via the
          overlay, a link, or swiping the panel back to the left. */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-4/5 max-w-xs flex flex-col gap-2 border-r-border/70 bg-card p-4 md:hidden"
          onTouchStart={onPanelTouchStart}
          onTouchMove={onPanelTouchMove}
        >
          <SheetHeader className="mb-3 border-b pb-4 text-left">
            <SheetTitle className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Dumbbell className="h-5 w-5" />
              </span>
              <span>Workout<span className="text-primary">Buddy</span></span>
            </SheetTitle>
          </SheetHeader>

          {navLinks.map(link => (
            <Button
              key={link.path}
              variant="ghost"
              className={cn(
                'h-11 w-full justify-start gap-3 px-3 text-muted-foreground',
                isActive(link.path) && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
              )}
              onClick={() => goTo(link.path)}
              aria-current={isActive(link.path) ? 'page' : undefined}
            >
              {link.icon}
              <span>{link.label}</span>
            </Button>
          ))}

          <RemindersTriggerButton
            variant="menu-item"
            onClick={() => { setRemindersOpen(true); setMobileMenuOpen(false); }}
          />
        </SheetContent>
      </Sheet>

      {/* Mounted once, independent of the drawer above — see the comment
          on RemindersDialog for why it can't live inside that Sheet. */}
      <RemindersDialog open={remindersOpen} onOpenChange={setRemindersOpen} />
    </nav>
  );
};

export default Navbar;
