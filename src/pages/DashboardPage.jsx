import React, { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import TopHeader from '../components/layout/TopHeader';
import BottomNav from '../components/layout/BottomNav';
import DashboardView from '../views/DashboardView';
import TransactionsView from '../views/TransactionsView';
import BudgetView from '../views/BudgetView';
import AIInsightView from '../views/AIInsightView';
import ProfileView from '../views/ProfileView';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../api/profileApi';

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOnboarded, setIsOnboarded] = useState(true);

  useEffect(() => {
    if (user?.email) {
      const onboardedFlag = localStorage.getItem(`finmitra_onboarded_${user.email}`);
      const isProfileDone = profileApi.isProfileCompleted(user.email);
      // Force user to complete onboarding & financial profile setup if not completed
      if (!onboardedFlag || !isProfileDone) {
        setIsOnboarded(false);
      } else {
        setIsOnboarded(true);
      }
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    if (user?.email) {
      localStorage.setItem(`finmitra_onboarded_${user.email}`, 'true');
    }
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

      {/* Left Vertical Navigation (Desktop) */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main App Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden pb-16 md:pb-0">
        <TopHeader onNavigateTab={(tab) => setActiveTab(tab)} />

        <div className="flex-1 overflow-y-auto">
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

          {activeTab === 'profile' && (
            <ProfileView onNavigateTab={(tab) => setActiveTab(tab)} />
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar (Mobile only) */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
