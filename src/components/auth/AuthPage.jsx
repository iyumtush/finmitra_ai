import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { login, signup, loading, error, isConfigured } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    if (!isLogin && !name.trim()) {
      setLocalError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setLocalError('Password must be at least 6 characters long');
      return;
    }

    if (isLogin) {
      const res = await login(email, password);
      if (!res.success) setLocalError(res.error);
    } else {
      const res = await signup(name, email, password);
      if (!res.success) {
        setLocalError(res.error);
      } else if (res.requiresSignIn || res.message) {
        setSuccessMessage(res.message || 'Account created successfully! Please sign in.');
        setIsLogin(true);
        setPassword('');
      }
    }
  };

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col md:flex-row w-full">
      {/* Left Side: Brand & Value Proposition (Hidden on Mobile) */}
      <div className="hidden md:flex flex-col w-1/2 bg-primary relative overflow-hidden text-on-primary">
        <div className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBIGYk7NsxcnBLjp_upls-SLocPnfocMymeGtXn4epwVl6lcBpIMGNo8_WxR8iAasWOiVueuMfnMo__-BLjbvRyVeEpQyz8VT4f4-k5TbuflklS3YmYCHy7JSkLZyQ6X5yIuzvjEjzerPc8TyZZzHkJpoTgiXnpeHnvRE-seWauewD1OTNKq8tZNZQWgrvLYVWAAJoy7ad4Yd61LEpgwExRPRRQndGY1I2v-V7Qe8i3hzerbWtOPCRouA')" }}></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/40"></div>

        <div className="relative z-10 flex flex-col justify-between h-full p-12 lg:p-24 max-w-[800px] mx-auto w-full">
          {/* Logo Area */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-on-primary flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
            </div>
            <span className="font-headline-md text-headline-md font-bold text-on-primary tracking-tight">FinMitra</span>
          </div>

          {/* Hero Copy */}
          <div className="mt-auto mb-16 space-y-6">
            <h1 className="font-display-lg text-display-lg text-on-primary">
              Your Financial Future, <br /><span className="text-secondary-fixed-dim">Simplified.</span>
            </h1>
            <p className="font-body-lg text-body-lg text-primary-fixed max-w-lg">
              Experience institutional-grade financial oversight powered by intelligent context-aware chat and automated AI receipt parsing.
            </p>
          </div>

          {/* Trust Badges */}
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-container/50 border border-on-primary/10 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-fixed-dim shrink-0">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>track_changes</span>
              </div>
              <div>
                <h3 className="font-label-md text-label-md text-on-primary">Smart Tracking</h3>
                <p className="font-label-sm text-label-sm text-primary-fixed mt-1 font-normal">Automated categorization of every transaction.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-container/50 border border-on-primary/10 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-fixed-dim shrink-0">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
              </div>
              <div>
                <h3 className="font-label-md text-label-md text-on-primary">AI Insights</h3>
                <p className="font-label-sm text-label-sm text-primary-fixed mt-1 font-normal">Context-aware chatting for deeper financial analysis.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-container/50 border border-on-primary/10 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-fixed-dim shrink-0">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              </div>
              <div>
                <h3 className="font-label-md text-label-md text-on-primary">Bank-Grade Security</h3>
                <p className="font-label-sm text-label-sm text-primary-fixed mt-1 font-normal">End-to-end encryption protecting your data.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="w-full md:w-1/2 min-h-screen flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-surface">
        {/* Mobile Logo (Visible only on small screens) */}
        <div className="absolute top-8 left-6 md:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
          </div>
          <span className="font-headline-md text-headline-md text-primary tracking-tight">FinMitra</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="absolute top-8 right-6 md:right-12 w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors z-50"
          title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        <div className="w-full max-w-md">
          {/* Auth Card */}
          <div className="bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant shadow-sm rounded-xl p-8 lg:p-10">
            <div className="mb-8 text-center">
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {isLogin ? 'Access your secure financial dashboard.' : 'Start your journey to financial freedom.'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-surface-container rounded-lg mb-8">
              <button
                onClick={() => { setIsLogin(true); setLocalError(''); setSuccessMessage(''); }}
                className={`flex-1 py-2 text-center rounded-md font-label-md text-label-md transition-all ${isLogin ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsLogin(false); setLocalError(''); setSuccessMessage(''); }}
                className={`flex-1 py-2 text-center rounded-md font-label-md text-label-md transition-all ${!isLogin ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Create Account
              </button>
            </div>

            {/* Error / Success Alerts */}
            {!isConfigured && (
              <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-sm">
                <strong>⚠️ Vercel Environment Variables Missing</strong><br />
                VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not configured.
              </div>
            )}
            {(localError || error) && (
              <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-sm">
                {localError || error}
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 bg-secondary-container text-on-secondary-container rounded-lg text-sm">
                {successMessage}
              </div>
            )}

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                      <span className="material-symbols-outlined text-lg">person</span>
                    </span>
                    <input
                      className="w-full h-12 pl-10 pr-4 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface placeholder:text-outline focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md text-body-md"
                      placeholder="e.g Rahul Kumar"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block font-label-sm text-label-sm text-on-surface-variant">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                    <span className="material-symbols-outlined text-lg">mail</span>
                  </span>
                  <input
                    className="w-full h-12 pl-10 pr-4 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface placeholder:text-outline focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md text-body-md"
                    placeholder="name@company.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant">Password</label>
                  {isLogin && (
                    <a className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors" href="#" onClick={(e) => { e.preventDefault(); alert('Password reset link sent.'); }}>
                      Forgot Password?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                    <span className="material-symbols-outlined text-lg">lock</span>
                  </span>
                  <input
                    className="w-full h-12 pl-10 pr-10 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface placeholder:text-outline focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md text-body-md"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface-variant transition-colors"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
              </div>

              <button
                className="w-full h-12 mt-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-primary-container transition-colors shadow-sm active:scale-[0.98] disabled:opacity-70"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                {!loading && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-surface-container-lowest font-label-sm text-label-sm text-outline">Or continue with</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-label-md text-label-md flex items-center justify-center gap-3 hover:bg-surface-container-low transition-colors">
                <img className="w-5 h-5 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-f_Ya413zbx1Pt9SRRAMUvgcveMR5XLZocaAFIX9GC-mnaCaZQ-FBY22Yy-1LZvNzUBd5hLvd7CWMQToEf4Frclx945aFtXv8GAH3cOEpF5u_H0W3CIy7BWj2jAPNXBIWxG9_OI3fUtbSmfym4dbWsdaW9ZuvzRxR8JmgXgmCAh5MOIWs0sgi005-ZboT_lI-PbHEsNnh8j2XFp49yDz0uyNmCmb8LRDqXzfBP-_4hV7IHarAp3LMGQ" alt="Google" />
                Google
              </button>
              <button className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-label-md text-label-md flex items-center justify-center gap-3 hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>file_download</span>
                Apple
              </button>
            </div>
          </div>

          <div className="text-center mt-6">
            <p className="font-label-sm text-label-sm text-outline">
              By continuing, you agree to our <a className="text-on-surface-variant hover:text-secondary underline underline-offset-2" href="#">Terms of Service</a> and <a className="text-on-surface-variant hover:text-secondary underline underline-offset-2" href="#">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
