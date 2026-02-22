
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import ExerciseManager from '@/components/ExerciseManager';
import CreateWorkoutModal from '@/components/CreateWorkoutModal';

const ExercisesPage = () => {
  const [isCreateWorkoutModalOpen, setIsCreateWorkoutModalOpen] = useState(false);

  const handleOpenCreateWorkout = () => {
    setIsCreateWorkoutModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar onOpenCreateWorkout={handleOpenCreateWorkout} />
      
      <main className="flex-1 container mx-auto py-6 px-4 md:px-6">
        <ExerciseManager />
      </main>

      <CreateWorkoutModal
        isOpen={isCreateWorkoutModalOpen}
        onClose={() => setIsCreateWorkoutModalOpen(false)}
      />
    </div>
  );
};

export default ExercisesPage;
