import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import AutoSync from "@/components/AutoSync";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AccessibilityController } from "./components/AccessibilityController";
import { PwaUpdatePrompt } from "@/components/PwaUpdatePrompt";
import Index from "./pages/Index";

// Every route past the dashboard is code-split so the initial load only
// ships the landing screen. The Suspense fallback covers the fetch.
const NotFound = lazy(() => import("./pages/NotFound"));
const ExercisesPage = lazy(() => import("./pages/Exercises"));
const ExerciseProgress = lazy(() => import("./pages/ExerciseProgress"));
const WorkoutDetail = lazy(() => import("./pages/WorkoutDetail"));
const WorkoutPresentation = lazy(() => import("./pages/WorkoutPresentation"));
const CalendarPage = lazy(() => import("./pages/Calendar"));
const HistoryPage = lazy(() => import("./pages/History"));
const WorkoutsPage = lazy(() => import("./pages/Workouts"));
const ProgressPage = lazy(() => import("./pages/Progress"));
const CoursesPage = lazy(() => import("./pages/Courses"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const EditCourse = lazy(() => import("./pages/EditCourse"));
const SettingsPage = lazy(() => import("./pages/Settings"));

const RouteFallback = () => (
  <div className="min-h-[100dvh] flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// A same-day course may repeat the same workout template. Keying by both
// route and query resets all timers/results for each distinct course slot.
const WorkoutPresentationRoute = () => {
  const location = useLocation();
  return <WorkoutPresentation key={`${location.pathname}${location.search}`} />;
};

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <DataProvider>
        <AutoSync />
        <AccessibilityController />
        <PwaUpdatePrompt />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/exercises" element={<ExercisesPage />} />
              <Route path="/exercises/:id/progress" element={<ExerciseProgress />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/workouts" element={<WorkoutsPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:id" element={<CourseDetail />} />
              <Route path="/courses/:id/edit" element={<EditCourse />} />
              <Route path="/workouts/:id" element={<WorkoutDetail />} />
              <Route path="/workouts/:id/session" element={<WorkoutPresentationRoute />} />
              {/* Legacy URLs remain available for bookmarks and old schedules. */}
              <Route path="/workout/:id" element={<WorkoutDetail />} />
              <Route path="/workout/:id/start" element={<WorkoutPresentationRoute />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </DataProvider>
    </TooltipProvider>
  </ErrorBoundary>
);

export default App;
