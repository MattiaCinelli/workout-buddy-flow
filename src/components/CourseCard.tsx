import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Course } from '@/data/courses';
import { useData } from '@/contexts/DataContext';
import { Play, RotateCcw, CheckCircle2, BookOpen } from 'lucide-react';

interface CourseCardProps {
  course: Course;
  onStart?: (courseId: string) => void;
  onRestart?: (courseId: string) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onStart, onRestart }) => {
  const navigate = useNavigate();
  const { getWorkoutById, getCourseProgress, getNextWorkoutInCourse } = useData();
  
  const progress = getCourseProgress(course.id);
  const isCompleted = progress === 100;
  const isStarted = !!course.startedAt;
  const nextWorkout = getNextWorkoutInCourse(course.id);
  const nextWorkoutData = nextWorkout ? getWorkoutById(nextWorkout.workoutId) : null;
  
  const completedCount = course.workouts.filter(w => w.completed).length;
  const totalCount = course.workouts.length;

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/courses/${course.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{course.title}</CardTitle>
          </div>
          {isCompleted && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
        {course.description && (
          <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {course.difficulty && <Badge variant="secondary" className="capitalize">{course.difficulty}</Badge>}
          {course.durationWeeks && <Badge variant="outline">{course.durationWeeks}w</Badge>}
          {course.goal && <Badge variant="outline" className="max-w-full truncate">{course.goal}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completedCount}/{totalCount} program days</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Next workout info */}
          {!isCompleted && nextWorkoutData && (
            <div className="text-sm">
              <span className="text-muted-foreground">Next: </span>
              <span className="font-medium">{nextWorkoutData.title}</span>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
            {!isStarted ? (
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => onStart?.(course.id)}
              >
                <Play className="h-4 w-4 mr-1" />
                Start Course
              </Button>
            ) : isCompleted ? (
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1"
                onClick={() => onRestart?.(course.id)}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Restart Course
              </Button>
            ) : (
              <>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  Continue
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onRestart?.(course.id)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseCard;
