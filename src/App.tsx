import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import AutoSync from "@/components/AutoSync";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ExercisesPage from "./pages/Exercises";
import WorkoutDetail from "./pages/WorkoutDetail";
import WorkoutPresentation from "./pages/WorkoutPresentation";
import CalendarPage from "./pages/Calendar";
import HistoryPage from "./pages/History";
import WorkoutsPage from "./pages/Workouts";
import ProgressPage from "./pages/Progress";
import CoursesPage from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import EditCourse from "./pages/EditCourse";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DataProvider>
        <AutoSync />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/workouts" element={<WorkoutsPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/courses/:id/edit" element={<EditCourse />} />
            <Route path="/workout/:id" element={<WorkoutDetail />} />
            <Route path="/workout/:id/start" element={<WorkoutPresentation />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
