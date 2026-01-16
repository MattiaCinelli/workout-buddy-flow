
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dumbbell, Plus, Home, Menu, X, Library } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';

interface NavbarProps {
  onOpenCreateWorkout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onOpenCreateWorkout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="bg-white shadow-sm py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <Dumbbell className="h-6 w-6 text-workout-blue" />
          <span className="text-xl font-bold text-workout-blue">WorkoutBuddy</span>
        </div>
        
        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-4">
          <Button 
            variant={isActive('/') ? "default" : "ghost"} 
            className={`flex items-center gap-2 ${isActive('/') ? 'bg-workout-blue hover:bg-blue-600 text-white' : ''}`}
            onClick={() => navigate('/')}
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
          
          <Button 
            variant={isActive('/exercises') ? "default" : "ghost"} 
            className={`flex items-center gap-2 ${isActive('/exercises') ? 'bg-workout-blue hover:bg-blue-600 text-white' : ''}`}
            onClick={() => navigate('/exercises')}
          >
            <Library className="h-4 w-4" />
            <span>Exercises</span>
          </Button>
          
          <Button 
            onClick={onOpenCreateWorkout}
            className="bg-workout-green hover:bg-green-600 text-white flex items-center gap-2"
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
          <Button 
            variant={isActive('/') ? "default" : "outline"} 
            className={`flex items-center gap-2 w-full justify-start ${isActive('/') ? 'bg-workout-blue hover:bg-blue-600 text-white' : ''}`}
            onClick={() => {
              navigate('/');
              setMobileMenuOpen(false);
            }}
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
          
          <Button 
            variant={isActive('/exercises') ? "default" : "outline"} 
            className={`flex items-center gap-2 w-full justify-start ${isActive('/exercises') ? 'bg-workout-blue hover:bg-blue-600 text-white' : ''}`}
            onClick={() => {
              navigate('/exercises');
              setMobileMenuOpen(false);
            }}
          >
            <Library className="h-4 w-4" />
            <span>Exercises</span>
          </Button>
          
          <Button 
            onClick={() => {
              onOpenCreateWorkout();
              setMobileMenuOpen(false);
            }}
            className="bg-workout-green hover:bg-green-600 text-white flex items-center gap-2 w-full justify-start"
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
