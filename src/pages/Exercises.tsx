
import React from 'react';
import Navbar from '@/components/Navbar';
import ExerciseManager from '@/components/ExerciseManager';

const ExercisesPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-1 container mx-auto py-6 px-4 md:px-6">
        <ExerciseManager />
      </main>
    </div>
  );
};

export default ExercisesPage;
