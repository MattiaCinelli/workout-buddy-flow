import React from 'react';
import Navbar from '@/components/Navbar';
import ExerciseManager from '@/components/ExerciseManager';

const ExercisesPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="app-page">
        <ExerciseManager />
      </main>
    </div>
  );
};

export default ExercisesPage;
