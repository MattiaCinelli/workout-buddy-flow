import React, { useState } from 'react';
import { Plus, BookOpen, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import CreateCourseModal from '@/components/CreateCourseModal';
import CourseCard from '@/components/CourseCard';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const CoursesPage = () => {
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
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading courses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="app-page">
        {/* Header */}
        <div className="page-heading">
          <div className="page-heading__main">
            <div className="page-heading__icon"><BookOpen className="h-5 w-5" /></div>
            <div>
            <h1 className="page-title">Courses</h1>
            <p className="page-subtitle">Structured training programs with clear progression</p>
            </div>
          </div>
          
          <Button 
            onClick={() => setCreateCourseOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </div>

        {/* Courses Grid */}
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
      <CreateCourseModal 
        isOpen={createCourseOpen}
        onClose={() => setCreateCourseOpen(false)}
      />
    </div>
  );
};

export default CoursesPage;
