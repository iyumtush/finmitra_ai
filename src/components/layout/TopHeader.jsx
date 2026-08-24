import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function TopHeader() {
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full h-16 border-b border-outline-variant bg-surface-bright/80 dark:bg-surface/80 backdrop-blur-md">
      <div className="flex justify-between items-center px-4 md:px-8 w-full max-w-[1440px] mx-auto h-full">
        {/* Mobile Logo (Hidden on Desktop) */}
        <div className="md:hidden font-headline-sm text-headline-md font-bold text-primary">FinMitra</div>
        
        <div className="flex-1 flex justify-start">
          <div className="relative w-64 hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant">search</span>
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-surface-container-low border border-outline-variant rounded-full py-2 pl-10 pr-4 font-body-md text-body-md focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-on-background" 
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="text-on-surface-variant hover:text-secondary transition-colors cursor-pointer active:opacity-80"
          >
            <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          
          <button className="text-on-surface-variant hover:text-secondary transition-colors cursor-pointer active:opacity-80">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          
          <button onClick={toggleTheme} className="hidden md:block font-label-md text-label-md text-primary font-medium hover:text-secondary transition-colors cursor-pointer">
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          
          <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant ml-2 flex items-center justify-center text-on-surface-variant font-bold">
            {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
