import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { logout } = useAuth();

  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'transactions', icon: 'receipt_long', label: 'Transactions' },
    { id: 'budget', icon: 'account_balance_wallet', label: 'Budget' },
    { id: 'insights', icon: 'psychology', label: 'AI Insights' },
  ];

  return (
    <nav className="hidden md:flex flex-col h-screen sticky top-0 left-0 border-r border-outline-variant bg-surface-container-lowest dark:bg-surface-container-low shadow-sm dark:shadow-none w-[260px] shrink-0">
      <div className="px-8 py-6 border-b border-outline-variant">
        <h1 className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed">FinMitra</h1>
        <p className="font-label-sm text-[10px] leading-tight text-on-surface-variant uppercase mt-1">AI-Financial Adviser &<br/>Personal Wealth Management Platform</p>
      </div>
      <div className="flex-1 py-6 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2 px-4 py-3 cursor-pointer transition-all ${
                isActive
                  ? 'border-l-4 border-secondary-container dark:border-secondary text-secondary dark:text-secondary-fixed-dim font-semibold bg-surface-container-low dark:bg-surface-container-high'
                  : 'border-l-4 border-transparent text-on-surface-variant dark:text-on-surface-variant font-medium hover:bg-surface-container-high dark:hover:bg-surface-container-highest'
              }`}
            >
              <span 
                className="material-symbols-outlined" 
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span className="font-body-md text-body-md">{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="p-4 border-t border-outline-variant mt-auto">
        <button 
          onClick={logout}
          className="w-full bg-surface-container-low text-on-surface-variant py-3 rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
