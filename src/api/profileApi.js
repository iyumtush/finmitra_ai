/**
 * FinMitra User Profile API
 * Manages user financial profile state, local persistence, and Java backend sync.
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

const getAuthHeaders = () => {
  const token = localStorage.getItem('finmitra_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const profileApi = {
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

      localStorage.setItem('finmitra_profile_current', JSON.stringify(merged));

      // Asynchronously sync with Java backend if token exists
      const token = localStorage.getItem('finmitra_token');
      if (token) {
        fetch('/api/profile', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(merged)
        }).catch(e => console.warn('Backend profile sync skipped:', e.message));
      }

      return merged;
    } catch (err) {
      console.error('Error saving profile:', err);
      return profileData;
    }
  },

  getEmptyProfile: () => ({ ...EMPTY_PROFILE })
};
