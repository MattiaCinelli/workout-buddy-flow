import React, { useState } from 'react';
import { Plus, BookOpen, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import CreateWorkoutModal from '@/components/CreateWorkoutModal';
import CreateCourseModal from '@/components/CreateCourseModal';
import CourseCard from '@/components/CourseCard';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const CoursesPage = () => {
  const [createWorkoutOpen, setCreateWorkoutOpen] = useState(false);
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  
  const { courses, coursesLoading, startCourse, restartCourse } = useData();

  const handleStartCourse = async (courseId: string) => {
    await startCourse(courseId);
    toast.success('Course started!');
  };

  const handleRestartCourse = async (courseId: string) => {
    await restartCourse(courseId);
    toast.success('Course restarted!');
  };

  if (coursesLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar onOpenCreateWorkout={() => setCreateWorkoutOpen(true)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading courses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar onOpenCreateWorkout={() => setCreateWorkoutOpen(true)} />
      
      <main className="flex-1 container mx-auto py-6 px-4 md:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Courses</h1>
            <p className="text-muted-foreground">Structured workout programs to follow</p>
          </div>
          
          <Button 
            onClick={() => setCreateCourseOpen(true)}
            className="mt-4 md:mt-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </div>

        {/* Courses Grid */}
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <CourseCard 
                key={course.id} 
                course={course}
                onStart={handleStartCourse}
                onRestart={handleRestartCourse}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No courses yet</h2>
              <p className="text-muted-foreground mb-4">
                Create a course to follow a structured workout program
              </p>
              <Button onClick={() => setCreateCourseOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Course
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
      
      <CreateWorkoutModal 
        isOpen={createWorkoutOpen}
        onClose={() => setCreateWorkoutOpen(false)}
      />
      
      <CreateCourseModal 
        isOpen={createCourseOpen}
        onClose={() => setCreateCourseOpen(false)}
      />
    </div>
  );
};

export default CoursesPage;
