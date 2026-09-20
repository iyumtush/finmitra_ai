import React from 'react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'transactions', icon: 'receipt_long', label: 'Transactions' },
    { id: 'budget', icon: 'account_balance_wallet', label: 'Budget' },
    { id: 'insights', icon: 'psychology', label: 'AI Insights' },
    { id: 'profile', icon: 'account_circle', label: 'Profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest dark:bg-surface-container-low border-t border-outline-variant/50 flex justify-around items-center h-16 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.08)]">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="flex flex-col items-center justify-center w-full h-full py-1 text-on-surface-variant transition-all cursor-pointer active:scale-95"
          >
            <div
              className={`w-12 h-7 rounded-full flex items-center justify-center mb-0.5 transition-all ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container dark:bg-secondary/30 dark:text-secondary-fixed-dim font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
            </div>
            <span
              className={`font-label-sm text-[11px] leading-none transition-colors ${
                isActive
                  ? 'text-primary dark:text-secondary-fixed-dim font-semibold'
                  : 'text-on-surface-variant'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
