import React, { useState, useEffect } from 'react';
import { profileApi } from '../api/profileApi';
import { useAuth } from '../context/AuthContext';

export default function ProfileView({ onNavigateTab }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(() => profileApi.getUserProfile(user?.email));
  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const loaded = profileApi.getUserProfile(user?.email);
    if (user?.name && !loaded.fullName) {
      loaded.fullName = user.name;
    }
    setProfile(loaded);
  }, [user]);

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const saved = profileApi.saveUserProfile(profile, user?.email);
    setProfile(saved);
    setIsSaved(true);
    setSaveMessage('Profile saved! FinMitra AI is now personalized with your updated financial persona.');
    setTimeout(() => setSaveMessage(''), 5000);
  };

  // Financial calculations based on profile
  const age = Number(profile.age) || 28;
  const income = Number(profile.monthlyIncome) || 0;
  const emis = Number(profile.monthlyEMIs) || 0;
  const fixedExpenses = Number(profile.monthlyFixedExpenses) || 0;
  const dti = income > 0 ? ((emis / income) * 100).toFixed(1) : '0.0';
  const surplus = Math.max(0, income - emis - fixedExpenses);
  
  // Asset allocation: 100 - age rule
  const equityAllocation = Math.max(20, Math.min(85, 100 - age));
  const debtAllocation = 100 - equityAllocation;

  // Life Stage assessment
  const getLifeStage = (a) => {
    if (a < 30) return 'Early Career & Aggressive Growth';
    if (a < 45) return 'Family Building & Wealth Accumulation';
    if (a < 55) return 'Pre-Retirement & Capital Consolidation';
    return 'Retirement & Wealth Preservation';
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-surface w-full h-full">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-6">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">account_circle</span>
              User Financial Profile & Persona
            </h2>
            <p className="font-body-md text-on-surface-variant mt-1">
              Your profile directly powers FinMitra AI's personalized investment advice, risk analysis, and asset allocation calculations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isSaved && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 animate-in fade-in">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                AI Persona Active
              </span>
            )}
            <button
              onClick={() => onNavigateTab ? onNavigateTab('insights') : null}
              className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-label-md text-xs hover:bg-secondary/90 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">psychology</span>
              Ask AI About My Profile
            </button>
          </div>
        </div>

        {/* Notification Banner */}
        {saveMessage && (
          <div className="bg-secondary-container/30 border border-secondary text-secondary px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-in slide-in-from-top-2">
            <span className="material-symbols-outlined text-secondary text-xl">auto_awesome</span>
            <span className="font-medium">{saveMessage}</span>
          </div>
        )}

        {/* Top Summary Banner: AI Persona Snapshot */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
                {profile.fullName?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-primary">{profile.fullName || 'FinMitra User'}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary/15 text-secondary">
                    {profile.riskTolerance} Risk Persona
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    Age {age}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">work</span>
                  {profile.occupation || 'Professional'}
                  <span className="mx-1">•</span>
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  {getLifeStage(age)}
                </p>
              </div>
            </div>

            {/* Quick Metrics Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
              <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/60">
                <div className="text-[10px] text-on-surface-variant uppercase font-semibold">Monthly Income</div>
                <div className="text-sm font-bold text-primary mt-0.5">₹{income.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/60">
                <div className="text-[10px] text-on-surface-variant uppercase font-semibold">Monthly EMIs</div>
                <div className="text-sm font-bold text-error mt-0.5">₹{emis.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/60">
                <div className="text-[10px] text-on-surface-variant uppercase font-semibold">DTI Ratio</div>
                <div className={`text-sm font-bold mt-0.5 ${Number(dti) > 40 ? 'text-error' : 'text-emerald-600'}`}>
                  {dti}% {Number(dti) <= 40 ? '(Healthy)' : '(High)'}
                </div>
              </div>
              <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/60">
                <div className="text-[10px] text-on-surface-variant uppercase font-semibold">Free Surplus</div>
                <div className="text-sm font-bold text-secondary mt-0.5">₹{surplus.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* AI Recommended Asset Allocation Bar */}
          <div className="mt-6 pt-6 border-t border-outline-variant/60">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[16px]">pie_chart</span>
                AI Recommended Asset Allocation (Based on Age {age} Rule)
              </span>
              <span className="text-on-surface-variant font-medium">
                {equityAllocation}% Equity / Stocks • {debtAllocation}% Debt / Fixed Income
              </span>
            </div>
            <div className="w-full h-3.5 bg-surface-container-high rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="h-full bg-secondary transition-all duration-500 rounded-l-full" 
                style={{ width: `${equityAllocation}%` }}
                title={`Equities & Index Funds: ${equityAllocation}%`}
              ></div>
              <div 
                className="h-full bg-primary transition-all duration-500 rounded-r-full" 
                style={{ width: `${debtAllocation}%` }}
                title={`Debt, FDs & Gold: ${debtAllocation}%`}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-on-surface-variant mt-1.5 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-secondary inline-block"></span>
                Growth & Equities ({equityAllocation}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                Fixed Income & Capital Preservation ({debtAllocation}%)
              </span>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Section 1: Demographics & Income Commitments */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="border-b border-outline-variant/60 pb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">badge</span>
              <h3 className="font-headline-md text-headline-md text-primary">1. Demographics & Financial Cashflow</h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Full Name</label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Age (Years)</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={profile.age}
                  onChange={(e) => handleChange('age', parseInt(e.target.value) || '')}
                  required
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-body-md text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Dependents</label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={profile.dependents}
                  onChange={(e) => handleChange('dependents', parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-body-md text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Occupation / Job Title</label>
              <input
                type="text"
                value={profile.occupation}
                onChange={(e) => handleChange('occupation', e.target.value)}
                placeholder="e.g. Salaried Engineer, Business Owner, Doctor"
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-body-md text-on-surface focus:outline-none focus:border-secondary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Monthly Take-Home Income (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={profile.monthlyIncome}
                  onChange={(e) => handleChange('monthlyIncome', parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-body-md text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Existing Monthly EMIs (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={profile.monthlyEMIs}
                  onChange={(e) => handleChange('monthlyEMIs', parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-body-md text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Monthly Fixed Living Expenses (₹)</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={profile.monthlyFixedExpenses}
                onChange={(e) => handleChange('monthlyFixedExpenses', parseFloat(e.target.value) || 0)}
                placeholder="Rent, groceries, utility bills"
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-body-md text-on-surface focus:outline-none focus:border-secondary"
              />
              <p className="text-[11px] text-on-surface-variant mt-1">Used to compute your required 6-month emergency fund buffer.</p>
            </div>
          </div>

          {/* Section 2: Goals, Risk Appetite & Retirement Target */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="border-b border-outline-variant/60 pb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">track_changes</span>
              <h3 className="font-headline-md text-headline-md text-primary">2. Investment Strategy & Targets</h3>
            </div>

            {/* Risk Tolerance Selector */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-2">Risk Tolerance / Investment Appetite</label>
              <div className="grid grid-cols-3 gap-2">
                {['Conservative', 'Moderate', 'Aggressive'].map((level) => {
                  const isSelected = profile.riskTolerance === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleChange('riskTolerance', level)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'border-secondary bg-secondary/15 text-secondary shadow-sm ring-1 ring-secondary'
                          : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <span>{level}</span>
                      <span className="text-[10px] font-normal opacity-80">
                        {level === 'Conservative' ? 'Safety first' : level === 'Moderate' ? 'Balanced index' : 'High growth'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Primary Financial Goal</label>
              <input
                type="text"
                value={profile.primaryGoal}
                onChange={(e) => handleChange('primaryGoal', e.target.value)}
                placeholder="e.g. Buy a Home, Wealth Accumulation, Kid's Education"
                required
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-body-md text-on-surface focus:outline-none focus:border-secondary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Target Goal Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={profile.targetGoalAmount}
                  onChange={(e) => handleChange('targetGoalAmount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-body-md text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Target Retirement Age</label>
                <input
                  type="number"
                  min="35"
                  max="80"
                  value={profile.targetRetirementAge}
                  onChange={(e) => handleChange('targetRetirementAge', parseInt(e.target.value) || 60)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-body-md text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Investment Horizon</label>
                <select
                  value={profile.investmentHorizon}
                  onChange={(e) => handleChange('investmentHorizon', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-body-md text-on-surface focus:outline-none focus:border-secondary"
                >
                  <option value="1-3 Years">Short Term (&lt; 3 Years)</option>
                  <option value="3-5 Years">Medium Term (3 - 5 Years)</option>
                  <option value="5-10 Years">Long Term (5 - 10 Years)</option>
                  <option value="10+ Years">Ultra Long Term (10+ Years)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Emergency Fund Status</label>
                <select
                  value={profile.emergencyFundMonths}
                  onChange={(e) => handleChange('emergencyFundMonths', parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-body-md text-on-surface focus:outline-none focus:border-secondary"
                >
                  <option value="0">0 Months (No safety cushion)</option>
                  <option value="1">1 Month of Expenses</option>
                  <option value="3">3 Months (Basic safety)</option>
                  <option value="6">6 Months (Recommended)</option>
                  <option value="12">12 Months (Conservative)</option>
                </select>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3 mt-auto">
              <button
                type="submit"
                className="w-full py-3 bg-primary text-on-primary rounded-xl font-label-md text-sm font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                Save & Synchronize AI Financial Profile
              </button>
            </div>
          </div>
        </form>

      </div>
    </main>
  );
}
