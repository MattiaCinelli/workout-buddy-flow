import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import AutoSync from "@/components/AutoSync";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ExercisesPage from "./pages/Exercises";
import WorkoutDetail from "./pages/WorkoutDetail";
import WorkoutPresentation from "./pages/WorkoutPresentation";
import CalendarPage from "./pages/Calendar";
import HistoryPage from "./pages/History";
import WorkoutsPage from "./pages/Workouts";
import CoursesPage from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import EditCourse from "./pages/EditCourse";
import SettingsPage from "./pages/Settings";
import { AccessibilityController } from "./components/AccessibilityController";

// The chart-heavy screens pull in Recharts (~150 KB gzip) — load them only
// when visited so they stay off the initial bundle.
const ProgressPage = lazy(() => import("./pages/Progress"));
const ExerciseProgress = lazy(() => import("./pages/ExerciseProgress"));

const RouteFallback = () => (
  <div className="min-h-[100dvh] flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <DataProvider>
        <AutoSync />
        <AccessibilityController />
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
              <Route path="/workouts/:id/session" element={<WorkoutPresentation />} />
              {/* Legacy URLs remain available for bookmarks and old schedules. */}
              <Route path="/workout/:id" element={<WorkoutDetail />} />
              <Route path="/workout/:id/start" element={<WorkoutPresentation />} />
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
