/**
 * FinMitra User Profile API
 * Manages user financial profile state, persistence, and AI context synchronization.
 */

const DEFAULT_PROFILE = {
  fullName: 'Pratik Sharma',
  age: 28,
  occupation: 'Salaried Software Professional',
  city: 'Bengaluru, India',
  monthlyIncome: 75000,
  monthlyFixedExpenses: 28000,
  monthlyEMIs: 12000,
  dependents: 1,
  riskTolerance: 'Moderate', // 'Conservative' | 'Moderate' | 'Aggressive'
  investmentHorizon: '5-10 Years',
  primaryGoal: 'Buy a Home & Wealth Building',
  targetGoalAmount: 1500000,
  targetRetirementAge: 55,
  emergencyFundMonths: 3
};

export const profileApi = {
  /**
   * Get the current user's profile with fallback to sensible initial defaults
   */
  getUserProfile: (userEmail = null) => {
    try {
      const key = userEmail ? `finmitra_profile_${userEmail}` : 'finmitra_profile_default';
      const stored = localStorage.getItem(key) || localStorage.getItem('finmitra_profile_default');
      
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_PROFILE, ...parsed };
      }
    } catch (err) {
      console.warn('Error reading stored profile, using defaults:', err);
    }
    return { ...DEFAULT_PROFILE };
  },

  /**
   * Save and persist updated user profile
   */
  saveUserProfile: (profileData, userEmail = null) => {
    try {
      const key = userEmail ? `finmitra_profile_${userEmail}` : 'finmitra_profile_default';
      const merged = { ...DEFAULT_PROFILE, ...profileData };
      localStorage.setItem(key, JSON.stringify(merged));
      // Also save to generic key for AI access
      localStorage.setItem('finmitra_profile_default', JSON.stringify(merged));
      return merged;
    } catch (err) {
      console.error('Error saving profile:', err);
      return profileData;
    }
  },

  /**
   * Get default profile configuration
   */
  getDefaultProfile: () => ({ ...DEFAULT_PROFILE })
};
