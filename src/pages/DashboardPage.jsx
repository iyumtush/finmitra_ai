import React, { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import TopHeader from '../components/layout/TopHeader';
import DashboardView from '../views/DashboardView';
import TransactionsView from '../views/TransactionsView';
import BudgetView from '../views/BudgetView';
import AIInsightView from '../views/AIInsightView';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOnboarded, setIsOnboarded] = useState(true);

  useEffect(() => {
    if (user?.email) {
      const onboardedFlag = localStorage.getItem(`finmitra_onboarded_${user.email}`);
      if (!onboardedFlag) {
        setIsOnboarded(false);
      }
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    setIsOnboarded(true);
    // Refresh tab state to reload dashboard
    setActiveTab('dashboard');
  };

  return (
    <div className="bg-background text-on-background flex h-screen overflow-hidden antialiased w-full">
      {/* Onboarding Wizard Modal for First-Time Users */}
      {!isOnboarded && (
        <OnboardingModal user={user} onComplete={handleOnboardingComplete} />
      )}

      {/* Left Vertical Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main App Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader />

        <div className="contents">
          {activeTab === 'dashboard' && (
            <DashboardView onNavigateTab={(tab) => setActiveTab(tab)} />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView />
          )}

          {activeTab === 'budget' && (
            <BudgetView />
          )}

          {activeTab === 'insights' && (
            <AIInsightView />
          )}
        </div>
      </div>
    </div>
  );
}
