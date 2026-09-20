/**
 * FinMitra User Profile API
 * Manages user financial profile state, persistence, and AI context synchronization.
 */

const EMPTY_PROFILE = {
  fullName: '',
  age: '',
  occupation: '',
  city: '',
  monthlyIncome: '',
  monthlyFixedExpenses: '',
  monthlyEMIs: '',
  dependents: 0,
  riskTolerance: 'Moderate', // 'Conservative' | 'Moderate' | 'Aggressive'
  investmentHorizon: '5-10 Years',
  primaryGoal: '',
  targetGoalAmount: '',
  targetRetirementAge: 60,
  emergencyFundMonths: 0,
  isProfileCompleted: false
};

export const profileApi = {
  /**
   * Check if a specific user has completed their profile
   */
  isProfileCompleted: (userEmail = null) => {
    try {
      if (!userEmail) return false;
      const key = `finmitra_profile_${userEmail.trim().toLowerCase()}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Boolean(parsed.isProfileCompleted && (parsed.monthlyIncome || parsed.age));
      }
    } catch (e) {
      console.warn('Error checking profile completion:', e);
    }
    return false;
  },

  /**
   * Get the current user's profile.
   * If a user hasn't filled a profile yet, returns an uncompleted profile template
   * (never returns dummy hardcoded figures for new users).
   */
  getUserProfile: (userEmail = null) => {
    try {
      const email = userEmail ? userEmail.trim().toLowerCase() : null;
      if (email) {
        const key = `finmitra_profile_${email}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...EMPTY_PROFILE, ...parsed };
        }
      } else {
        const stored = localStorage.getItem('finmitra_profile_current') || localStorage.getItem('finmitra_profile_guest');
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...EMPTY_PROFILE, ...parsed };
        }
      }
    } catch (err) {
      console.warn('Error reading stored profile:', err);
    }
    return { ...EMPTY_PROFILE };
  },

  /**
   * Save and persist updated user profile
   */
  saveUserProfile: (profileData, userEmail = null) => {
    try {
      const email = userEmail ? userEmail.trim().toLowerCase() : null;
      const merged = { 
        ...EMPTY_PROFILE, 
        ...profileData, 
        isProfileCompleted: true 
      };
      
      if (email) {
        const key = `finmitra_profile_${email}`;
        localStorage.setItem(key, JSON.stringify(merged));
      } else {
        localStorage.setItem('finmitra_profile_guest', JSON.stringify(merged));
      }

      // Also set generic key so background AI services have a fallback
      localStorage.setItem('finmitra_profile_current', JSON.stringify(merged));
      return merged;
    } catch (err) {
      console.error('Error saving profile:', err);
      return profileData;
    }
  },

  /**
   * Get empty template configuration
   */
  getEmptyProfile: () => ({ ...EMPTY_PROFILE })
};
