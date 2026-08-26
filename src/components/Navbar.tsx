import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dumbbell, Home, Menu, X, Library, Calendar, History, ListChecks, TrendingUp, BookOpen } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountButton } from "@/components/AccountButton";
import { RemindersButton } from "@/components/RemindersButton";

const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="bg-card shadow-sm py-4 px-6 border-b">
      <div className="container mx-auto flex justify-between items-center">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <Dumbbell className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-primary">WorkoutBuddy</span>
        </div>
        
        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-2">
          <Button 
            variant={isActive('/') ? "default" : "ghost"} 
            className="flex items-center gap-2"
            onClick={() => navigate('/')}
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
          
          <Button 
            variant={isActive('/workouts') ? "default" : "ghost"} 
            className="flex items-center gap-2"
            onClick={() => navigate('/workouts')}
          >
            <ListChecks className="h-4 w-4" />
            <span>Workouts</span>
          </Button>
          
          <Button 
            variant={isActive('/exercises') ? "default" : "ghost"} 
            className="flex items-center gap-2"
            onClick={() => navigate('/exercises')}
          >
            <Library className="h-4 w-4" />
            <span>Exercises</span>
          </Button>
          
          <Button 
            variant={isActive('/calendar') ? "default" : "ghost"} 
            className="flex items-center gap-2"
            onClick={() => navigate('/calendar')}
          >
            <Calendar className="h-4 w-4" />
            <span>Calendar</span>
          </Button>
          
          <Button 
            variant={isActive('/history') ? "default" : "ghost"} 
            className="flex items-center gap-2"
            onClick={() => navigate('/history')}
          >
            <History className="h-4 w-4" />
            <span>History</span>
          </Button>
          
          <Button 
            variant={isActive('/progress') ? "default" : "ghost"} 
            className="flex items-center gap-2"
            onClick={() => navigate('/progress')}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Progress</span>
          </Button>
          
          <Button 
            variant={isActive('/courses') ? "default" : "ghost"} 
            className="flex items-center gap-2"
            onClick={() => navigate('/courses')}
          >
            <BookOpen className="h-4 w-4" />
            <span>Courses</span>
          </Button>
          
          <RemindersButton />
          <AccountButton />
          <ThemeToggle />
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <RemindersButton />
          <AccountButton />
          <ThemeToggle />
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
            className="flex items-center gap-2 w-full justify-start"
            onClick={() => {
              navigate('/');
              setMobileMenuOpen(false);
            }}
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
          
          <Button 
            variant={isActive('/workouts') ? "default" : "outline"} 
            className="flex items-center gap-2 w-full justify-start"
            onClick={() => {
              navigate('/workouts');
              setMobileMenuOpen(false);
            }}
          >
            <ListChecks className="h-4 w-4" />
            <span>Workouts</span>
          </Button>
          
          <Button 
            variant={isActive('/exercises') ? "default" : "outline"} 
            className="flex items-center gap-2 w-full justify-start"
            onClick={() => {
              navigate('/exercises');
              setMobileMenuOpen(false);
            }}
          >
            <Library className="h-4 w-4" />
            <span>Exercises</span>
          </Button>
          
          <Button 
            variant={isActive('/calendar') ? "default" : "outline"} 
            className="flex items-center gap-2 w-full justify-start"
            onClick={() => {
              navigate('/calendar');
              setMobileMenuOpen(false);
            }}
          >
            <Calendar className="h-4 w-4" />
            <span>Calendar</span>
          </Button>
          
          <Button 
            variant={isActive('/history') ? "default" : "outline"} 
            className="flex items-center gap-2 w-full justify-start"
            onClick={() => {
              navigate('/history');
              setMobileMenuOpen(false);
            }}
          >
            <History className="h-4 w-4" />
            <span>History</span>
          </Button>
          
          <Button 
            variant={isActive('/progress') ? "default" : "outline"} 
            className="flex items-center gap-2 w-full justify-start"
            onClick={() => {
              navigate('/progress');
              setMobileMenuOpen(false);
            }}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Progress</span>
          </Button>
          
          <Button 
            variant={isActive('/courses') ? "default" : "outline"} 
            className="flex items-center gap-2 w-full justify-start"
            onClick={() => {
              navigate('/courses');
              setMobileMenuOpen(false);
            }}
          >
            <BookOpen className="h-4 w-4" />
            <span>Courses</span>
          </Button>
          
        </div>
      )}
    </nav>
  );
};

export default Navbar;
