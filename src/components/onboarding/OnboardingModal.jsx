import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, ShieldCheck, DollarSign, User, Target, PieChart } from 'lucide-react';
import { transactionApi } from '../../api/transactionApi';
import { budgetApi } from '../../api/budgetApi';
import { profileApi } from '../../api/profileApi';
import './OnboardingModal.css';

export default function OnboardingModal({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Cashflow (Finance Questions)
  const [income, setIncome] = useState('');
  const [fixedExpenses, setFixedExpenses] = useState('');
  const [emis, setEmis] = useState('0');

  // Step 2: Profile (Personal Demographics)
  const [fullName, setFullName] = useState(user?.name || '');
  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('');
  const [dependents, setDependents] = useState('0');

  // Step 3: Goals & Risk (Investment Persona)
  const [primaryGoal, setPrimaryGoal] = useState('Buy a Home & Wealth Building');
  const [targetGoalAmount, setTargetGoalAmount] = useState('1500000');
  const [targetRetirementAge, setTargetRetirementAge] = useState('55');
  const [riskTolerance, setRiskTolerance] = useState('Moderate');

  // Step 4: Initial Budget
  const [budgetCategory, setBudgetCategory] = useState('Food');
  const [budgetLimit, setBudgetLimit] = useState('8000');

  const handleNext = () => {
    if (step === 1) {
      if (!income || parseFloat(income) <= 0) {
        alert('Please enter your estimated monthly income.');
        return;
      }
      if (!fixedExpenses || parseFloat(fixedExpenses) < 0) {
        alert('Please enter your estimated monthly fixed living expenses.');
        return;
      }
    }

    if (step === 2) {
      if (!fullName.trim()) {
        alert('Please enter your name.');
        return;
      }
      const numAge = parseInt(age);
      if (!age || isNaN(numAge) || numAge < 18 || numAge > 100) {
        alert('Please enter a valid age between 18 and 100.');
        return;
      }
      if (!occupation.trim()) {
        alert('Please enter your occupation / profession.');
        return;
      }
    }

    if (step === 3) {
      if (!primaryGoal.trim()) {
        alert('Please specify your primary financial goal.');
        return;
      }
      if (!targetGoalAmount || parseFloat(targetGoalAmount) <= 0) {
        alert('Please enter a target goal amount.');
        return;
      }
      const retAge = parseInt(targetRetirementAge);
      if (!retAge || retAge < 35 || retAge > 80) {
        alert('Please enter a realistic target retirement age (35-80).');
        return;
      }
    }

    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleFinish = async (e) => {
    e.preventDefault();
    if (!budgetLimit || parseFloat(budgetLimit) <= 0) {
      alert('Please enter a monthly budget limit.');
      return;
    }

    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // 1. Save User Profile with real data
      const cleanProfile = {
        fullName: fullName.trim() || user?.name || 'FinMitra User',
        age: parseInt(age) || 25,
        occupation: occupation.trim() || 'Professional',
        city: 'India',
        monthlyIncome: parseFloat(income) || 0,
        monthlyFixedExpenses: parseFloat(fixedExpenses) || 0,
        monthlyEMIs: parseFloat(emis) || 0,
        dependents: parseInt(dependents) || 0,
        riskTolerance,
        investmentHorizon: '5-10 Years',
        primaryGoal: primaryGoal.trim() || 'Wealth Building',
        targetGoalAmount: parseFloat(targetGoalAmount) || 1000000,
        targetRetirementAge: parseInt(targetRetirementAge) || 60,
        emergencyFundMonths: 3,
        isProfileCompleted: true
      };
      profileApi.saveUserProfile(cleanProfile, user?.email);

      // 2. Log initial Salary Income Transaction
      if (parseFloat(income) > 0) {
        await transactionApi.createTransaction({
          amount: parseFloat(income),
          category: 'Salary',
          note: 'Monthly salary / income baseline',
          type: 'INCOME',
          date: today
        });
      }

      // 3. Log initial Fixed Expense Transaction
      if (parseFloat(fixedExpenses) > 0) {
        await transactionApi.createTransaction({
          amount: parseFloat(fixedExpenses),
          category: 'Rent',
          note: 'Monthly fixed living expenses',
          type: 'EXPENSE',
          date: today
        });
      }

      // 4. Set initial Category Budget Limit
      if (parseFloat(budgetLimit) > 0) {
        await budgetApi.setBudget({
          category: budgetCategory,
          limitAmount: parseFloat(budgetLimit)
        });
      }

      // 5. Mark user as onboarded in localStorage
      localStorage.setItem(`finmitra_onboarded_${user?.email || 'user'}`, 'true');

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Onboarding Profile Setup Error:', err);
      // Fallback mark onboarded so user isn't permanently locked
      localStorage.setItem(`finmitra_onboarded_${user?.email || 'user'}`, 'true');
      if (onComplete) onComplete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-card">
        {/* Header Badge */}
        <div className="onboarding-header">
          <div className="flex items-center justify-center mb-1">
            <img src="/logo.png" alt="FinMitra Logo" className="w-11 h-11 rounded-xl shadow-md object-contain" />
          </div>
          <div className="onboarding-badge">
            <Sparkles size={14} />
            <span>FinMitra Financial & Profile Setup</span>
          </div>
          <h2 className="onboarding-title text-xl">Let's build your financial profile</h2>
          <p className="onboarding-sub text-xs">Answer a few questions to calibrate your AI advisor and dashboard metrics.</p>
        </div>

        {/* Step Indicator Pills */}
        <div className="steps-indicator">
          <div className={`step-pill ${step >= 1 ? 'active' : ''}`}>1. Cashflow</div>
          <div className={`step-pill ${step >= 2 ? 'active' : ''}`}>2. Profile</div>
          <div className={`step-pill ${step >= 3 ? 'active' : ''}`}>3. Goals & Risk</div>
          <div className={`step-pill ${step >= 4 ? 'active' : ''}`}>4. Budget</div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFinish} className="onboarding-form">
          {/* STEP 1: Finance Questions (Cashflow) */}
          {step === 1 && (
            <div className="step-content">
              <div className="step-icon-badge">
                <DollarSign size={24} />
              </div>
              <h3>1. Your Monthly Cashflow</h3>
              <p className="step-desc">Enter your recurring monthly earnings and fixed obligations.</p>

              <div className="input-group">
                <label>Monthly Take-Home Income (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 65000"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  required
                  autoFocus
                />
                <span className="step-hint">Salary or primary monthly incoming revenue.</span>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>Fixed Living Expenses (₹) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 25000"
                    value={fixedExpenses}
                    onChange={(e) => setFixedExpenses(e.target.value)}
                    required
                  />
                  <span className="step-hint">Rent, utilities, groceries</span>
                </div>

                <div className="input-group">
                  <label>Existing Monthly EMIs (₹)</label>
                  <input
                    type="number"
                    placeholder="0 if none"
                    value={emis}
                    onChange={(e) => setEmis(e.target.value)}
                  />
                  <span className="step-hint">Home/car/personal loan</span>
                </div>
              </div>

              <button type="button" className="btn btn-primary full-btn" onClick={handleNext}>
                Continue to Profile Questions <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 2: Profile Questions (Demographics) */}
          {step === 2 && (
            <div className="step-content">
              <div className="step-icon-badge">
                <User size={24} />
              </div>
              <h3>2. Profile & Life Stage</h3>
              <p className="step-desc">Used directly to compute your 100 - age asset allocation and risk profile.</p>

              <div className="input-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>Age (Years) *</label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    placeholder="e.g. 24"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                  />
                  <span className="step-hint">Determines equity-debt ratio</span>
                </div>

                <div className="input-group">
                  <label>Dependents</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={dependents}
                    onChange={(e) => setDependents(e.target.value)}
                  />
                  <span className="step-hint">Children / elderly dependents</span>
                </div>
              </div>

              <div className="input-group">
                <label>Occupation / Profession *</label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer, Business Owner, Student, Doctor"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  required
                />
              </div>

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={handleBack}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="button" className="btn btn-primary" style={{ margin: 0, flex: 1 }} onClick={handleNext}>
                  Continue to Goals <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Goals & Risk Strategy */}
          {step === 3 && (
            <div className="step-content">
              <div className="step-icon-badge">
                <Target size={24} />
              </div>
              <h3>3. Financial Goals & Risk Appetite</h3>
              <p className="step-desc">Tell FinMitra AI what you are building towards.</p>

              <div className="input-group">
                <label>Primary Financial Goal *</label>
                <input
                  type="text"
                  placeholder="e.g. Buy a Home & Wealth Building, Kid's Education"
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>Target Goal Amount (₹) *</label>
                  <input
                    type="number"
                    step="50000"
                    placeholder="e.g. 1500000"
                    value={targetGoalAmount}
                    onChange={(e) => setTargetGoalAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Target Retirement Age *</label>
                  <input
                    type="number"
                    min="35"
                    max="80"
                    placeholder="e.g. 55"
                    value={targetRetirementAge}
                    onChange={(e) => setTargetRetirementAge(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Risk Tolerance / Investment Style</label>
                <div className="risk-selector">
                  {['Conservative', 'Moderate', 'Aggressive'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setRiskTolerance(level)}
                      className={`risk-option ${riskTolerance === level ? 'selected' : ''}`}
                    >
                      <span>{level}</span>
                      <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                        {level === 'Conservative' ? 'Safety' : level === 'Moderate' ? 'Balanced' : 'High Growth'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={handleBack}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="button" className="btn btn-primary" style={{ margin: 0, flex: 1 }} onClick={handleNext}>
                  Continue to Budget <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Budget Goal & Dashboard Entry */}
          {step === 4 && (
            <div className="step-content">
              <div className="step-icon-badge">
                <PieChart size={24} />
              </div>
              <h3>4. Set Your Initial Budget Cap</h3>
              <p className="step-desc">Pick one category you want to monitor closely this month.</p>

              <div className="input-group">
                <label>Budget Category</label>
                <select value={budgetCategory} onChange={(e) => setBudgetCategory(e.target.value)}>
                  <option value="Food">Food & Dining</option>
                  <option value="Online Shopping">Online Shopping</option>
                  <option value="Travel & Transport">Travel & Transport</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Rent">Rent</option>
                </select>
              </div>

              <div className="input-group">
                <label>Monthly Limit (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 8000"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={handleBack} disabled={loading}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit" className="btn btn-primary" style={{ margin: 0, flex: 1 }} disabled={loading}>
                  {loading ? 'Configuring AI & Dashboard...' : 'Complete Profile & Enter Dashboard ✨'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="onboarding-footer">
          <ShieldCheck size={14} />
          <span>Your data is stored securely and private to your account.</span>
        </div>
      </div>
    </div>
  );
}
