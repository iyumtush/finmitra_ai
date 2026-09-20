import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function TopHeader() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-outline-variant bg-surface-bright/80 dark:bg-surface/80 backdrop-blur-md">
      <div className="flex justify-between items-center px-4 md:px-8 w-full max-w-[1440px] mx-auto h-full">
        {/* Mobile Logo (Visible on mobile, hidden on desktop where Sidebar shows logo) */}
        <div className="md:hidden font-headline-sm text-headline-sm font-bold text-primary dark:text-primary-fixed tracking-tight flex items-center gap-2">
          <img src="/logo.png" alt="FinMitra Logo" className="w-7 h-7 rounded-md object-contain shrink-0" />
          <span>FinMitra</span>
        </div>
        
        {/* Search Input (Desktop) */}
        <div className="flex-1 hidden md:flex justify-start">
          <div className="relative w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant text-lg">search</span>
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-surface-container-low border border-outline-variant rounded-full py-1.5 pl-10 pr-4 font-body-md text-body-md focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-on-background" 
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={toggleTheme}
            className="p-1.5 text-on-surface-variant hover:text-secondary transition-colors cursor-pointer active:opacity-80 rounded-full"
            title="Toggle theme"
          >
            <span className="material-symbols-outlined text-[22px]">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          
          <button className="p-1.5 text-on-surface-variant hover:text-secondary transition-colors cursor-pointer active:opacity-80 rounded-full">
            <span className="material-symbols-outlined text-[22px]">notifications</span>
          </button>
          
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container overflow-hidden border border-outline-variant flex items-center justify-center font-bold text-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')}
          </div>

          <button 
            onClick={logout} 
            className="p-1.5 text-on-surface-variant hover:text-error transition-colors cursor-pointer active:opacity-80 flex items-center gap-1"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-[22px]">logout</span>
            <span className="hidden md:inline font-label-md text-label-md">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
