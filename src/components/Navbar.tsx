
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dumbbell, Plus, History, Menu, X } from "lucide-react";

interface NavbarProps {
  onOpenCreateWorkout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onOpenCreateWorkout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <nav className="bg-white shadow-sm py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-workout-blue" />
          <span className="text-xl font-bold text-workout-blue">WorkoutBuddy</span>
        </div>
        
        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-4">
          <Button variant="outline" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span>History</span>
          </Button>
          
          <Button 
            onClick={onOpenCreateWorkout}
            className="bg-workout-blue hover:bg-blue-600 text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Workout</span>
          </Button>
        </div>
        
        {/* Mobile menu button */}
        <div className="md:hidden">
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <div className="container mx-auto mt-3 flex flex-col gap-2 md:hidden pb-3">
          <Button variant="outline" className="flex items-center gap-2 w-full justify-start">
            <History className="h-4 w-4" />
            <span>History</span>
          </Button>
          
          <Button 
            onClick={() => {
              onOpenCreateWorkout();
              setMobileMenuOpen(false);
            }}
            className="bg-workout-blue hover:bg-blue-600 text-white flex items-center gap-2 w-full justify-start"
          >
            <Plus className="h-4 w-4" />
            <span>New Workout</span>
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
