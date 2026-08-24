import React, { useState, useEffect } from 'react';
import { aiApi } from '../api/aiApi';
import ChatBotWidget from '../components/chat/ChatBotWidget';

export default function AIInsightView() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await aiApi.getInsights();
      setInsights(data);
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
      setErrorMsg('Failed to generate AI financial insights. Please make sure the backend is running and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-surface w-full h-full">
      <div className="max-w-[1440px] mx-auto h-full flex flex-col gap-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">psychology</span>
              AI Insights & Advisor
            </h2>
            <p className="font-body-md text-on-surface-variant mt-1">Real-time contextual analysis computed from your live database entries</p>
          </div>
          <button 
            onClick={fetchInsights}
            disabled={loading}
            className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-DEFAULT font-label-md text-label-md hover:bg-surface-container-lowest transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            {loading ? 'Analyzing...' : 'Refresh Insights'}
          </button>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[500px]">
          
          {/* Left Column: AI Cards */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {loading ? (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex-1 flex flex-col items-center justify-center p-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-4 animate-spin text-secondary">refresh</span>
                <h3 className="font-headline-md text-primary mb-2">Analyzing your financial patterns...</h3>
                <p>Evaluating income, expenses, and category budget thresholds</p>
              </div>
            ) : errorMsg ? (
              <div className="bg-error-container text-on-error-container rounded-xl p-6 flex items-center gap-3">
                <span className="material-symbols-outlined">error</span>
                <p>{errorMsg}</p>
              </div>
            ) : (
              <>
                {/* Monthly Summary */}
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-6xl text-secondary">explore</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4 relative z-10">
                    <span className="material-symbols-outlined text-secondary">explore</span>
                    <h3 className="font-headline-md text-primary">Monthly Summary</h3>
                  </div>
                  <p className="font-body-md text-on-surface-variant mb-6 relative z-10">
                    {insights?.monthlySummary || "Your financial activity is looking stable this month."}
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4 relative z-10">
                    <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/50">
                      <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Income</p>
                      <p className="font-headline-md text-secondary">₹{Number(insights?.income || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/50">
                      <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Expense</p>
                      <p className="font-headline-md text-error">₹{Number(insights?.expense || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/50">
                      <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Savings</p>
                      <p className="font-headline-md text-primary">₹{Number(insights?.savings || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Smart Savings Advice */}
                  <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-secondary">lightbulb</span>
                      <h3 className="font-headline-md text-primary">Smart Savings Advice</h3>
                    </div>
                    <ul className="space-y-3">
                      {insights?.savingSuggestions?.length ? insights.savingSuggestions.map((tip, idx) => (
                        <li key={idx} className="flex gap-3 font-body-md text-on-surface-variant">
                          <span className="text-secondary shrink-0">💡</span>
                          <span>{tip}</span>
                        </li>
                      )) : (
                        <li className="flex gap-3 font-body-md text-on-surface-variant">
                          <span className="text-secondary shrink-0">💡</span>
                          <span>Consider tracking more expenses to get personalized tips.</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Wealth Growth Strategy */}
                  <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-secondary">trending_up</span>
                      <h3 className="font-headline-md text-primary">Wealth Growth Strategy</h3>
                    </div>
                    <p className="font-body-md text-on-surface-variant">
                      {insights?.growthIdea || "Keep saving consistently to build an emergency fund."}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column: AI Chatbot */}
          <div className="lg:col-span-4 h-full flex flex-col">
            <ChatBotWidget />
          </div>
        </div>
      </div>
    </main>
  );
}
