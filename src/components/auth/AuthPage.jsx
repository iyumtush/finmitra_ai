import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../supabaseClient';

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
      } else {
        setSuccessMessage(res.message || 'Account created successfully! Please sign in with your email and password.');
        setIsLogin(true);
        setPassword('');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      if (!isConfigured) {
        setLocalError('Authentication service is not configured yet.');
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      setLocalError(err.message || 'Google sign in could not be initiated.');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row w-full transition-colors duration-200 ${isDarkMode ? 'bg-[#090d16] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* ─── Left Side: Product Showcase & Authentic Value Proposition (Desktop) ─── */}
      <div className="hidden md:flex flex-col w-1/2 relative overflow-hidden bg-[#070b14] text-white p-10 lg:p-16 justify-between border-r border-slate-800/80">
        
        {/* Subtle Ambient Mesh Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/2 -right-24 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute -bottom-24 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Subtle Decorative Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        ></div>

        {/* Header / Brand Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 p-1.5 flex items-center justify-center shadow-md backdrop-blur-md">
              <img src="/logo.png" alt="FinMitra Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                FinMitra
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                  AI Finance
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Hero Section & Live UI Simulation Widget */}
        <div className="relative z-10 my-auto py-8 space-y-8 max-w-lg">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-cyan-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Personal Finance & Wealth Management
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Smart Personal Finance. <br />
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Intelligently Guided.
              </span>
            </h1>
            <p className="text-slate-300 text-sm lg:text-base leading-relaxed">
              Track daily expenses, scan paper receipts with AI, and get real-time financial guidance tailored to your actual age, income, and targets.
            </p>
          </div>

          {/* Realistic Product Snapshot Card */}
          <div className="bg-slate-900/85 border border-slate-700/60 rounded-2xl p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-semibold text-slate-200">FinMitra AI Assistant</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-cyan-300 font-medium">
                Live Personalization
              </span>
            </div>

            {/* Simulated Chat Dialogue */}
            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-2.5 text-slate-300 flex items-start gap-2">
                <span className="material-symbols-outlined text-[15px] text-cyan-400 shrink-0 mt-0.5">account_circle</span>
                <span>"How should I allocate my monthly savings surplus?"</span>
              </div>
              <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-3 text-cyan-100 flex items-start gap-2">
                <span className="material-symbols-outlined text-[15px] text-cyan-400 shrink-0 mt-0.5">psychology</span>
                <div className="leading-relaxed">
                  <span className="font-semibold text-cyan-300">Based on your age: </span>
                  Allocate <strong className="text-white">75% into Equity Index Funds</strong> for compounding growth, and <strong className="text-white">25% into Liquid Debt & Emergency Fund</strong>.
                </div>
              </div>
            </div>

            {/* Quick Metrics Badges */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
              <div className="bg-slate-950/60 p-2 rounded-lg text-center border border-slate-800">
                <div className="text-slate-400 text-[9px] uppercase font-semibold">Asset Split</div>
                <div className="font-bold text-cyan-400 mt-0.5">75% Eq / 25% Debt</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg text-center border border-slate-800">
                <div className="text-slate-400 text-[9px] uppercase font-semibold">Bill Scanning</div>
                <div className="font-bold text-emerald-400 mt-0.5">Instant OCR</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg text-center border border-slate-800">
                <div className="text-slate-400 text-[9px] uppercase font-semibold">Export Formats</div>
                <div className="font-bold text-blue-400 mt-0.5">PDF • CSV • JSON</div>
              </div>
            </div>
          </div>

          {/* Genuine Value Features */}
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3 text-xs text-slate-300">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[14px]">document_scanner</span>
              </div>
              <div>
                <strong className="text-white">AI Receipt & Bill Scanner:</strong> Upload cafe, grocery, or restaurant receipts to auto-extract store names and amounts.
              </div>
            </div>
            <div className="flex items-start gap-3 text-xs text-slate-300">
              <div className="w-6 h-6 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[14px]">tune</span>
              </div>
              <div>
                <strong className="text-white">Custom Financial Persona:</strong> Calculates your debt-to-income ratio, emergency cushion, and retirement runway.
              </div>
            </div>
            <div className="flex items-start gap-3 text-xs text-slate-300">
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[14px]">file_download</span>
              </div>
              <div>
                <strong className="text-white">Statement Downloads:</strong> Generate clean printable PDF statements and CSV records with a single click.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 text-xs text-slate-500 flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          <span>Your financial records are kept strictly private to your user account.</span>
        </div>
      </div>

      {/* ─── Right Side: Clean Authentication Form ─── */}
      <div className={`w-full md:w-1/2 min-h-screen flex items-center justify-center p-6 sm:p-12 relative overflow-hidden transition-colors ${isDarkMode ? 'bg-[#0a0e17]' : 'bg-slate-50'}`}>
        
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="absolute top-6 left-6 md:hidden flex items-center gap-2.5">
          <img src="/logo.png" alt="FinMitra Logo" className="w-8 h-8 rounded-lg shadow-sm object-contain" />
          <span className="text-lg font-bold tracking-tight">FinMitra</span>
        </div>

        {/* Theme Toggle Pill */}
        <button
          onClick={toggleTheme}
          className={`absolute top-6 right-6 md:right-10 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer shadow-sm ${
            isDarkMode 
              ? 'bg-slate-800/90 text-slate-200 border border-slate-700 hover:bg-slate-700' 
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
          }`}
          title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
        >
          <span className="material-symbols-outlined text-[16px] text-amber-400">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* Form Container Card */}
        <div className="w-full max-w-md pt-8 md:pt-0">
          <div className={`rounded-2xl p-8 sm:p-10 transition-all ${
            isDarkMode
              ? 'bg-[#121826]/95 border border-slate-800/90 shadow-2xl shadow-black/60 backdrop-blur-xl'
              : 'bg-white border border-slate-200 shadow-xl shadow-slate-200/60'
          }`}>
            
            {/* Header */}
            <div className="mb-7 text-center">
              <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {isLogin ? 'Welcome Back' : 'Create Your Account'}
              </h2>
              <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {isLogin 
                  ? 'Sign in to access your personal dashboard & AI advisor.' 
                  : 'Start tracking expenses and personal finances.'}
              </p>
            </div>

            {/* Tab Switcher (Segmented Control) */}
            <div className={`flex p-1 rounded-xl mb-6 ${isDarkMode ? 'bg-slate-900/90 border border-slate-800' : 'bg-slate-100 border border-slate-200/80'}`}>
              <button
                type="button"
                onClick={() => { setIsLogin(true); setLocalError(''); setSuccessMessage(''); }}
                className={`flex-1 py-2 text-center text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  isLogin
                    ? isDarkMode 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'bg-white text-slate-900 shadow-sm'
                    : isDarkMode 
                      ? 'text-slate-400 hover:text-slate-200' 
                      : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setLocalError(''); setSuccessMessage(''); }}
                className={`flex-1 py-2 text-center text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  !isLogin
                    ? isDarkMode 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'bg-white text-slate-900 shadow-sm'
                    : isDarkMode 
                      ? 'text-slate-400 hover:text-slate-200' 
                      : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error / Success Alerts */}
            {(localError || error) && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                <span>{localError || error}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0">check_circle</span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="space-y-1">
                  <label className={`block text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Full Name
                  </label>
                  <div className="relative">
                    <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <span className="material-symbols-outlined text-[18px]">person</span>
                    </span>
                    <input
                      className={`w-full h-11 pl-10 pr-4 rounded-xl border text-sm outline-none transition-all ${
                        isDarkMode
                          ? 'bg-slate-900/80 border-slate-700/80 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20'
                      }`}
                      placeholder="e.g. Rahul Sharma"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className={`block text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email Address
                </label>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                  </span>
                  <input
                    className={`w-full h-11 pl-10 pr-4 rounded-xl border text-sm outline-none transition-all ${
                      isDarkMode
                        ? 'bg-slate-900/80 border-slate-700/80 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20'
                    }`}
                    placeholder="you@domain.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={`block text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => alert('Please enter your email and contact your workspace administrator to reset credentials.')}
                      className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                  </span>
                  <input
                    className={`w-full h-11 pl-10 pr-11 rounded-xl border text-sm outline-none transition-all ${
                      isDarkMode
                        ? 'bg-slate-900/80 border-slate-700/80 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20'
                    }`}
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-600/20 active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : (isLogin ? 'Sign In to Dashboard' : 'Create My Account')}
                {!loading && <span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className={`px-3 uppercase font-medium ${isDarkMode ? 'bg-[#121826] text-slate-500' : 'bg-white text-slate-400'}`}>
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social / OAuth Options */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className={`w-full h-11 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900/60 border-slate-700/80 text-slate-200 hover:bg-slate-800'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Privacy Footnote */}
          <div className="text-center mt-6">
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              Your financial records are strictly private and secure to your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
