import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dumbbell, Home, Menu, Library, Calendar, History, ListChecks, TrendingUp, BookOpen, Settings } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountButton } from "@/components/AccountButton";
import { RemindersDialog, RemindersTriggerButton } from "@/components/RemindersButton";

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

  const isActive = (path: string) => location.pathname === path;

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
    <nav className="bg-card shadow-sm py-4 px-6 border-b">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-1">
          {/* Menu sits before the logo, mobile only — thumb-reachable on
              the left edge, next to the left-edge open-swipe zone. */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <Dumbbell className="h-6 w-6 text-primary" />
            <span className="hidden text-xl font-bold text-primary min-[400px]:inline">WorkoutBuddy</span>
          </div>
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-2">
          {navLinks.map(link => (
            <Button
              key={link.path}
              variant={isActive(link.path) ? "default" : "ghost"}
              className="flex items-center gap-2"
              onClick={() => navigate(link.path)}
            >
              {link.icon}
              <span>{link.label}</span>
            </Button>
          ))}

          <RemindersTriggerButton onClick={() => setRemindersOpen(true)} />
          <AccountButton />
          <ThemeToggle />
        </div>

        {/* Mobile top bar — menu lives on the left, next to the logo */}
        <div className="md:hidden flex items-center gap-1">
          <AccountButton />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile navigation drawer — opens via the button above or by
          swiping right from the screen's left edge; closes via the
          overlay, a link, or swiping the panel back to the left. */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-4/5 max-w-xs flex flex-col gap-2 md:hidden"
          onTouchStart={onPanelTouchStart}
          onTouchMove={onPanelTouchMove}
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              WorkoutBuddy
            </SheetTitle>
          </SheetHeader>

          {navLinks.map(link => (
            <Button
              key={link.path}
              variant={isActive(link.path) ? "default" : "outline"}
              className="flex items-center gap-2 w-full justify-start"
              onClick={() => goTo(link.path)}
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
