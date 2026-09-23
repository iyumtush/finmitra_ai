import { transactionApi } from './transactionApi';
import { budgetApi } from './budgetApi';
import { profileApi } from './profileApi';

// ─── Gemini REST API (bypasses npm package v1beta issues) ───
const getGeminiKeys = () => {
  const keys = [];
  
  // 1. Collect sequentially numbered keys (e.g., VITE_GEMINI_API_KEY_1, VITE_GEMINI_API_KEY_2...)
  for (let i = 1; i <= 10; i++) {
    const k = import.meta.env[`VITE_GEMINI_API_KEY_${i}`];
    if (k) keys.push(k.trim().replace(/^["']|["']$/g, ''));
  }
  
  // 2. Also collect the primary key or comma-separated list
  const raw = (
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    import.meta.env.GEMINI_API_KEY ||
    ''
  ).trim();
  
  if (raw) {
    const primaryKeys = raw.replace(/^["']|["']$/g, '').split(',').map(k => k.trim()).filter(Boolean);
    keys.push(...primaryKeys);
  }
  
  // Deduplicate
  return [...new Set(keys)];
};

const getGrokKey = () => {
  const raw = (
    import.meta.env.VITE_GROK_API_KEY ||
    import.meta.env.NEXT_PUBLIC_GROK_API_KEY ||
    import.meta.env.GROK_API_KEY ||
    ''
  ).trim();
  return raw.replace(/^["']|["']$/g, '').trim();
};

const callGeminiREST = async (prompt, isJson = false, base64Image = null, mimeType = 'image/jpeg') => {
  const keys = getGeminiKeys();
  if (!keys.length) return null;

  const models = ['gemini-3.6-flash', 'gemini-1.5-flash'];
  let lastError = null;

  // Try each API key in sequence
  for (const key of keys) {
    // Try each model for the current key
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        
        const parts = [{ text: prompt }];
        if (base64Image) {
          parts.push({
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: base64Image
            }
          });
        }

        const body = {
          contents: [{ parts }],
          generationConfig: isJson
            ? { responseMimeType: 'application/json', temperature: 0.7 }
            : { temperature: 0.7 }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const res = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          lastError = new Error(`Key ending in ${key.slice(-4)} with Model ${model} returned ${res.status}`);
          // If it's a 429 (Too Many Requests), break inner model loop and try next API KEY
          if (res.status === 429) {
            break; 
          }
          // Otherwise, try next model with same key
          continue;
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } catch (err) {
        lastError = err;
      }
    }
  }

  console.warn('All Gemini REST calls failed:', lastError?.message || lastError);
  return null;
};

// ─── Financial Context Builder ───
const buildFinancialContext = (transactions, budgets) => {
  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0.0';

  const catSpends = {};
  transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
    catSpends[t.category] = (catSpends[t.category] || 0) + Number(t.amount || 0);
  });
  const sortedCats = Object.entries(catSpends).sort((a, b) => b[1] - a[1]);
  const topCat = sortedCats[0]?.[0] || 'General';
  const topCatAmount = sortedCats[0]?.[1] || 0;

  return { totalIncome, totalExpense, netSavings, savingsRate, catSpends, sortedCats, topCat, topCatAmount };
};

// ─── Smart Financial Advisor Fallback ───
const smartFinancialAdvisor = (message, ctx, userProfile = null) => {
  const profile = userProfile || profileApi.getUserProfile();
  const text = message.toLowerCase().trim();
  const { totalIncome, totalExpense, netSavings, savingsRate, catSpends, sortedCats, topCat, topCatAmount } = ctx;

  // ── Smart Amount Parser (handles 75k, 1.5lakh, 2cr, ₹50000, 30K, etc.) ──
  const parseAmount = (str) => {
    // Match patterns like: 75k, 1.5k, 2.5lakh, 1lakh, 2cr, 50000, 1,00,000, ₹5000
    const patterns = [
      { regex: /([\d,.]+)\s*(?:cr|crore|crores)/i, multiplier: 10000000 },
      { regex: /([\d,.]+)\s*(?:lakh|lakhs|lac|lacs|l)\b/i, multiplier: 100000 },
      { regex: /([\d,.]+)\s*(?:k|K|thousand|thousands)\b/i, multiplier: 1000 },
      { regex: /₹\s*([\d,.]+)/i, multiplier: 1 },
      { regex: /rs\.?\s*([\d,.]+)/i, multiplier: 1 },
      { regex: /rupees?\s*([\d,.]+)/i, multiplier: 1 },
    ];

    for (const { regex, multiplier } of patterns) {
      const match = str.match(regex);
      if (match) {
        const num = parseFloat(match[1].replace(/,/g, ''));
        if (num > 0) return Math.round(num * multiplier);
      }
    }

    // Fallback: find any standalone large number (e.g. "50000", "1,00,000")
    const plainNumbers = str.match(/\b[\d,]{3,}\b/g);
    if (plainNumbers) {
      for (const pn of plainNumbers) {
        const val = parseInt(pn.replace(/,/g, ''), 10);
        if (val >= 100) return val; // Only use numbers >= 100 as amounts
      }
    }

    return 0;
  };

  const targetAmount = parseAmount(text);

  // ── Smart Time Parser (handles months, years, weeks, days) ──
  let months = 0;
  const weekMatch = text.match(/([\d.]+)\s*(?:week|weeks|wk|wks)/i);
  const dayMatch = text.match(/([\d.]+)\s*(?:day|days)/i);
  const monthMatch = text.match(/([\d.]+)\s*(?:month|months|mo)/i);
  const yearMatch = text.match(/([\d.]+)\s*(?:year|years|yr|yrs)/i);
  if (weekMatch) months = parseFloat(weekMatch[1]) / 4.33; // weeks to months
  if (dayMatch) months = parseFloat(dayMatch[1]) / 30; // days to months
  if (monthMatch) months = parseFloat(monthMatch[1]);
  if (yearMatch) months = parseFloat(yearMatch[1]) * 12;

  // ── Non-finance filter ──
  const nonFinanceWords = ['weather', 'recipe', 'movie', 'game', 'football', 'cricket', 'who is', 'python code', 'java code', 'song', 'joke', 'tell me a story'];
  const financeWords = ['sip', 'invest', 'rupee', 'rs', '₹', 'money', 'budget', 'expense', 'income', 'bank', 'tax', 'loan', 'cost', 'pay', 'buy', 'afford', 'save', 'saving', 'salary', 'emi', 'fd', 'mutual', 'stock', 'nifty', 'lakh', 'crore', 'interest', 'return', 'profit', 'loss', 'debt', 'credit', 'insurance', 'goal', 'plan', 'month', 'year', 'spend', 'finance', 'wealth', 'portfolio', 'asset', 'profile', 'age', 'risk', 'retire', 'allocation'];
  const isNonFinance = nonFinanceWords.some(k => text.includes(k)) && !financeWords.some(k => text.includes(k));

  if (isNonFinance) {
    return ` FinMitra AI Assistant: I specialize in personal finance, investments, budgets, savings, and wealth management. Please ask me a finance-related question!`;
  }

  // ── User Profile & Financial Persona Query ──
  if (text.includes('profile') || text.includes('who am i') || text.includes('my detail') || text.includes('persona')) {
    if (!profile.isProfileCompleted || !profile.monthlyIncome) {
      return ` User Financial Profile Setup Pending:
Your profile has not been fully configured yet! Please head over to the Profile & Goals tab (or complete the initial setup) to input your age, monthly income, and goals for personalized AI guidance.`;
    }

    const age = profile.age || 25;
    const equityPct = Math.max(20, Math.min(85, 100 - age));
    const debtPct = 100 - equityPct;
    const dti = profile.monthlyIncome > 0 ? ((profile.monthlyEMIs / profile.monthlyIncome) * 100).toFixed(1) : '0.0';

    return ` User Financial Profile & Persona Summary:
- Name: ${profile.fullName || 'User'}
- Age: ${profile.age} years | Occupation: ${profile.occupation}
- Monthly Income: ₹${(profile.monthlyIncome || totalIncome).toLocaleString('en-IN')}
- Fixed Expenses: ₹${(profile.monthlyFixedExpenses || 0).toLocaleString('en-IN')} | EMIs: ₹${(profile.monthlyEMIs || 0).toLocaleString('en-IN')} (DTI: ${dti}%)
- Risk Appetite: ${profile.riskTolerance || 'Moderate'}
- Primary Financial Goal: ${profile.primaryGoal || 'Wealth Building'} (Target: ₹${(profile.targetGoalAmount || 0).toLocaleString('en-IN')})
- Target Retirement Age: ${profile.targetRetirementAge || 60} (${Math.max(1, (profile.targetRetirementAge || 60) - age)} years to retirement)
- Recommended Asset Split (100 - Age rule): ${equityPct}% Equity / Index Funds | ${debtPct}% Debt / Fixed Income
- Recommended Emergency Buffer: ₹${((profile.monthlyFixedExpenses || 0) * 6).toLocaleString('en-IN')} (6 months fixed costs)`;
  }

  // ── Asset Allocation / Portfolio Split Questions ──
  if (text.includes('asset allocation') || text.includes('allocation') || text.includes('portfolio split') || text.includes('equity') || text.includes('100 - age') || (text.includes('how') && text.includes('invest') && text.includes('my money'))) {
    const age = profile.age || 28;
    const equityPct = Math.max(20, Math.min(85, 100 - age));
    const debtPct = 100 - equityPct;

    return ` Personalized Asset Allocation Strategy (Age ${age}, ${profile.riskTolerance} Risk):
- Equity & Growth Assets: ${equityPct}% (e.g., Nifty 50 Index Funds, Flexi-Cap Funds, Global Equities)
- Debt & Fixed Income: ${debtPct}% (e.g., High-Yield FDs, Corporate Bonds, Gold, Liquid Funds)

Why this fits your profile:
- Based on the standard 100 - Age rule, at age ${age} you have ${Math.max(1, profile.targetRetirementAge - age)} years until your target retirement age of ${profile.targetRetirementAge}. This provides ample compounding runway for higher equity participation.
- Risk Tolerance Alignment: As a ${profile.riskTolerance} investor, prioritize large-cap and index mutual funds before individual small-cap stocks.`;
  }

  // ── Retirement Questions ──
  if (text.includes('retire') || text.includes('retirement') || text.includes('pension')) {
    const age = profile.age || 28;
    const retAge = profile.targetRetirementAge || 55;
    const yearsLeft = Math.max(1, retAge - age);
    const monthsLeft = yearsLeft * 12;
    // Assume monthly expenses in retirement are current fixed expenses
    const exp = profile.monthlyFixedExpenses || 28000;
    // Rule of thumb: 25-30x annual expenses
    const estimatedCorpus = exp * 12 * 25;
    // Rough monthly SIP required at 12% CAGR to reach corpus
    const r = 0.12 / 12;
    const sipNeeded = Math.round(estimatedCorpus * r / ((Math.pow(1 + r, monthsLeft) - 1) * (1 + r)));

    return ` Personalized Retirement Roadmap (Target Age: ${retAge}):
- Current Age: ${age} | Years to Retirement: ${yearsLeft} years
- Estimated Retirement Corpus Target (25x annual expenses): ₹${estimatedCorpus.toLocaleString('en-IN')}
- Recommended Monthly SIP at ~12% CAGR: ₹${sipNeeded.toLocaleString('en-IN')}/month
- Current Net Savings Surplus: ₹${netSavings.toLocaleString('en-IN')}/month

Action Plan:
- ${netSavings >= sipNeeded ? `Great news! Your current monthly surplus of ₹${netSavings.toLocaleString('en-IN')} easily covers the required retirement SIP of ₹${sipNeeded.toLocaleString('en-IN')}.` : `Your current surplus is ₹${netSavings.toLocaleString('en-IN')}. Consider starting an initial SIP of ₹${Math.round(netSavings * 0.4).toLocaleString('en-IN')} and step it up by 10% each year with salary increments.`}
- Maintain your emergency fund of ₹${(exp * 6).toLocaleString('en-IN')} so you never have to break retirement investments prematurely.`;
  }

  // ── Emergency Fund Questions ──
  if (text.includes('emergency') || text.includes('cushion') || text.includes('buffer')) {
    const fixed = profile.monthlyFixedExpenses || 28000;
    const target6Months = fixed * 6;
    const currentMonths = profile.emergencyFundMonths || 0;
    const currentSaved = fixed * currentMonths;
    const gap = Math.max(0, target6Months - currentSaved);

    return ` Emergency Fund Health Check:
- Monthly Fixed Expenses: ₹${fixed.toLocaleString('en-IN')}
- Ideal 6-Month Emergency Cushion: ₹${target6Months.toLocaleString('en-IN')}
- Current Emergency Coverage: ${currentMonths} months (~₹${currentSaved.toLocaleString('en-IN')})
- Remaining Gap to Bridge: ₹${gap.toLocaleString('en-IN')}

Advice:
${gap === 0 ? 'Your emergency fund is fully funded! All additional surplus can be deployed into long-term investments like index funds or your primary financial goal.' : `Set aside ₹${Math.round(Math.min(netSavings * 0.5, gap / 6)).toLocaleString('en-IN')}/month in a high-yield liquid fund or sweep-in FD until the 6-month buffer of ₹${target6Months.toLocaleString('en-IN')} is fully achieved.`}`;
  }

  // ── Saving Goal / Target Questions ──
  if ((text.includes('save') || text.includes('saving') || text.includes('make') || text.includes('goal') || text.includes('target') || text.includes('reach') || text.includes('accumulate') || text.includes('need')) && (targetAmount > 0 || text.includes('primary'))) {
    const effectiveAmount = targetAmount > 0 ? targetAmount : profile.targetGoalAmount;
    const effectiveGoalName = targetAmount > 0 ? 'Custom Goal' : profile.primaryGoal;
    const effectiveMonths = months || 24; // default 24 months for goal
    const monthlySavingNeeded = Math.ceil(effectiveAmount / effectiveMonths);
    const gap = monthlySavingNeeded - netSavings;
    const isAchievable = netSavings >= monthlySavingNeeded;

    let advice = ` Financial Goal Analysis:
- Target Goal: ${effectiveGoalName}
- Target Amount: ₹${effectiveAmount.toLocaleString('en-IN')} over ${effectiveMonths} months
- Current Monthly Surplus: ₹${netSavings.toLocaleString('en-IN')} (${savingsRate}% savings rate)
- Monthly Allocation Required: ₹${monthlySavingNeeded.toLocaleString('en-IN')}/month\n`;

    if (isAchievable) {
      advice += `\n Achievable! You currently save ₹${netSavings.toLocaleString('en-IN')}/month, which comfortably covers the required ₹${monthlySavingNeeded.toLocaleString('en-IN')}/month.
- Remaining free cashflow after goal SIP: ₹${(netSavings - monthlySavingNeeded).toLocaleString('en-IN')}/month.
- Recommendation: Automate this into a dedicated Goal-based SIP on your salary date.`;
    } else {
      advice += `\n Stretch Goal: Required ₹${monthlySavingNeeded.toLocaleString('en-IN')}/month exceeds current surplus ₹${netSavings.toLocaleString('en-IN')}/month.
- Shortfall: ₹${gap.toLocaleString('en-IN')}/month
- Solutions:
  1. Extend timeline to ${Math.ceil(effectiveAmount / (netSavings || 1))} months.
  2. Optimize ${topCat} category spending (currently ₹${topCatAmount.toLocaleString('en-IN')}) to unlock more surplus.`;
    }
    return advice;
  }

  // ── SIP / Investment ──
  if (text.includes('sip') || text.includes('mutual fund') || text.includes('invest') || text.includes('stock') || text.includes('nifty') || text.includes('fd') || text.includes('portfolio')) {
    const sipAmount = targetAmount || Math.floor(netSavings * 0.3);
    const percentOfSavings = netSavings > 0 ? ((sipAmount / netSavings) * 100).toFixed(0) : 0;
    // Rough 12% annual return estimate
    const monthlyRate = 0.12 / 12;
    const sipYears = [1, 3, 5, 10];
    const projections = sipYears.map(y => {
      const n = y * 12;
      const fv = sipAmount * (((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate) * (1 + monthlyRate));
      return { years: y, value: Math.round(fv), invested: sipAmount * n };
    });

    return ` SIP & Investment Analysis: SIP Amount: ₹${sipAmount.toLocaleString('en-IN')}/month (~${percentOfSavings}% of your monthly surplus ₹${netSavings.toLocaleString('en-IN')})

 Projected Growth (assuming ~12% annual returns): ${projections.map(p => `- ${p.years} year${p.years > 1 ? 's' : ''}: ₹${p.value.toLocaleString('en-IN')} (Invested: ₹${p.invested.toLocaleString('en-IN')})`).join('\n')}

 Recommendations: - ${sipAmount <= netSavings * 0.5 ? ' This is a healthy SIP allocation!' : ' Consider reducing SIP to 30-50% of surplus for liquidity.'}
- Start with Nifty 50 Index Funds or Flexi-Cap Funds for balanced long-term growth.
- Maintain an emergency fund of ₹${(totalExpense * 3).toLocaleString('en-IN')} (3 months expenses) before investing.`;
  }

  // ── EMI / Loan ──
  if (text.includes('emi') || text.includes('loan') || text.includes('borrow') || text.includes('interest rate')) {
    const loanAmount = targetAmount || 500000;
    const annualRate = 0.10; // 10% default
    const tenureMonths = months || 36;
    const r = annualRate / 12;
    const emi = Math.round(loanAmount * r * Math.pow(1 + r, tenureMonths) / (Math.pow(1 + r, tenureMonths) - 1));
    const totalPayable = emi * tenureMonths;
    const totalInterest = totalPayable - loanAmount;
    const emiAffordable = emi <= netSavings * 0.5;

    return ` Loan / EMI Calculator: - Loan Amount: ₹${loanAmount.toLocaleString('en-IN')}
- Interest Rate: ~10% per annum
- Tenure: ${tenureMonths} months
- Monthly EMI: ₹${emi.toLocaleString('en-IN')}
- Total Interest Paid: ₹${totalInterest.toLocaleString('en-IN')}
- Total Payable: ₹${totalPayable.toLocaleString('en-IN')}

${emiAffordable
  ? ` Affordable: EMI of ₹${emi.toLocaleString('en-IN')} is within 50% of your monthly surplus (₹${netSavings.toLocaleString('en-IN')}).`
  : ` Caution: EMI of ₹${emi.toLocaleString('en-IN')} is more than 50% of your monthly surplus (₹${netSavings.toLocaleString('en-IN')}). Consider a longer tenure or smaller loan.`}`;
  }

  // ── Buying / Affordability ──
  if (text.includes('buy') || text.includes('afford') || text.includes('purchase') || text.includes('car') || text.includes('phone') || text.includes('bike') || text.includes('house') || text.includes('laptop')) {
    const purchaseAmt = targetAmount || 50000;
    const monthsToSave = Math.ceil(purchaseAmt / (netSavings || 1));
    return ` Affordability Analysis: - Purchase Cost: ₹${purchaseAmt.toLocaleString('en-IN')}
- Your Monthly Surplus: ₹${netSavings.toLocaleString('en-IN')}
- Time to Save: ~${monthsToSave} month${monthsToSave > 1 ? 's' : ''}

 ${purchaseAmt <= netSavings
  ? ` You can afford this from a single month's savings!`
  : `Save ₹${Math.ceil(purchaseAmt / 3).toLocaleString('en-IN')}/month for 3 months in a separate savings account.`}
- Always ensure your emergency fund (₹${(totalExpense * 3).toLocaleString('en-IN')}) remains untouched.`;
  }

  // ── Tax Questions ──
  if (text.includes('tax') || text.includes('80c') || text.includes('section') || text.includes('deduction') || text.includes('regime')) {
    return ` Tax Planning Guidance: Based on your annual income of ~₹${(totalIncome * 12).toLocaleString('en-IN')}: - Section 80C: Invest up to ₹1,50,000/year in ELSS, PPF, or NPS for tax deduction.
- Section 80D: Health insurance premiums up to ₹25,000 (₹50,000 for senior citizens).
- Standard Deduction: ₹50,000 automatically deducted for salaried employees.
- New vs Old Regime: If your total deductions exceed ₹3,75,000, the old regime may save you more tax.

 Tip: Start a ₹12,500/month ELSS SIP to maximize 80C while building wealth!`;
  }

  // ── Expense / Spending Analysis ──
  if (text.includes('expense') || text.includes('spent') || text.includes('spending') || text.includes('cost') || text.includes('where does my money go')) {
    const catBreakdown = sortedCats.slice(0, 5).map(([cat, amt]) => `- ${cat}: ₹${amt.toLocaleString('en-IN')} (${((amt / totalExpense) * 100).toFixed(0)}%)`).join('\n');
    return ` Detailed Expense Analysis: - Total Expenses: ₹${totalExpense.toLocaleString('en-IN')}
- Expense-to-Income Ratio: ${((totalExpense / (totalIncome || 1)) * 100).toFixed(1)}%

 Category Breakdown (Top ${Math.min(5, sortedCats.length)}): ${catBreakdown}

 Tip: Try to reduce your top category ${topCat} spending by 10-15% to increase your savings rate from ${savingsRate}% to ~${(parseFloat(savingsRate) + 5).toFixed(1)}%.`;
  }

  // ── Income / Salary ──
  if (text.includes('income') || text.includes('salary') || text.includes('earn')) {
    return ` Income Summary: - Monthly Income: ₹${totalIncome.toLocaleString('en-IN')}
- Annual Income (projected): ₹${(totalIncome * 12).toLocaleString('en-IN')}
- Net Surplus: ₹${netSavings.toLocaleString('en-IN')}/month (${savingsRate}% savings rate)

 Wealth Building Tip: At your current savings rate, you'll accumulate ₹${(netSavings * 12).toLocaleString('en-IN')} per year in savings. Consider investing 50% of this in SIPs for long-term compounding!`;
  }

  // ── Budget Questions ──
  if (text.includes('budget') || text.includes('limit') || text.includes('cap') || text.includes('over budget')) {
    return ` Budget Status: ${sortedCats.map(([cat, amt]) => `- ${cat}: ₹${amt.toLocaleString('en-IN')} spent`).join('\n')}

 50/30/20 Rule for ₹${totalIncome.toLocaleString('en-IN')} income: - Needs (50%): ₹${Math.round(totalIncome * 0.5).toLocaleString('en-IN')}
- Wants (30%): ₹${Math.round(totalIncome * 0.3).toLocaleString('en-IN')}
- Savings/Invest (20%): ₹${Math.round(totalIncome * 0.2).toLocaleString('en-IN')}`;
  }

  // ── General / Catch-all Financial Answer ──
  return ` FinMitra AI Financial Summary: Your Financial Snapshot: - Income: ₹${totalIncome.toLocaleString('en-IN')} | Expenses: ₹${totalExpense.toLocaleString('en-IN')}
- Net Savings: ₹${netSavings.toLocaleString('en-IN')}/month (${savingsRate}% rate)
- Top Spend: ${topCat} (₹${topCatAmount.toLocaleString('en-IN')})

I can help you with detailed analysis! Try asking: - "How much should I save to make ₹1 lakh in 3 months?"
- "Should I start a SIP of ₹5000?"
- "Can I afford a laptop for ₹60,000?"
- "Calculate EMI for a ₹5 lakh loan"
- "How to save tax on my income?"`;
};

// ─── Exported API ───
export const aiApi = {
  getInsights: async () => {
    try {
      const transactions = await transactionApi.getTransactions();
      const budgets = await budgetApi.getBudgets();
      const userProfile = profileApi.getUserProfile();
      const ctx = buildFinancialContext(transactions, budgets);

      let monthlySummary = `You earned ₹${ctx.totalIncome.toLocaleString('en-IN')} and spent ₹${ctx.totalExpense.toLocaleString('en-IN')}, saving ₹${ctx.netSavings.toLocaleString('en-IN')} (${ctx.savingsRate}% savings rate).`;
      let savingSuggestions = [
        `Aim to allocate at least 20% of your income into emergency funds or SIPs towards your goal of ${userProfile.primaryGoal}.`,
        "Review top recurring expense categories to identify unnecessary costs.",
        `Maintain a liquid emergency buffer of ₹${(userProfile.monthlyFixedExpenses * 6).toLocaleString('en-IN')} (6 months of fixed expenses).`
      ];
      let growthIdea = `Based on your ${userProfile.riskTolerance} risk profile and age ${userProfile.age}, allocate ${Math.max(20, Math.min(85, 100 - userProfile.age))}% of surplus into Nifty 50 / Flexi-Cap equity funds and ${100 - Math.max(20, Math.min(85, 100 - userProfile.age))}% into fixed income/gold.`;

      // Try Gemini REST API for richer insights
      try {
        const prompt = `You are FinMitra AI Assistant, an expert personal finance and wealth management advisor. Analyze the following live financial data and user persona:
User Profile:
- Name: ${userProfile.fullName}
- Age: ${userProfile.age}
- Occupation: ${userProfile.occupation}
- Risk Tolerance: ${userProfile.riskTolerance}
- Primary Financial Goal: ${userProfile.primaryGoal} (Target: ₹${userProfile.targetGoalAmount})
- Target Retirement Age: ${userProfile.targetRetirementAge}
- Monthly Income: ₹${userProfile.monthlyIncome || ctx.totalIncome}
- Monthly Fixed Expenses: ₹${userProfile.monthlyFixedExpenses}
- Monthly EMIs: ₹${userProfile.monthlyEMIs}
- Dependents: ${userProfile.dependents}

Live Financial Data:
- Total Recorded Income: ₹${ctx.totalIncome}
- Total Recorded Expenses: ₹${ctx.totalExpense}
- Net Savings: ₹${ctx.netSavings}
- Savings Rate: ${ctx.savingsRate}%
- Top Expense Category: ${ctx.topCat} (₹${ctx.topCatAmount})
- Recent Transactions: ${JSON.stringify(transactions.slice(0, 10))}
- Active Budgets: ${JSON.stringify(budgets)}

Provide a highly personalized, flexible, and actionable financial insight report. Do not use generic advice; directly leverage their user profile (age ${userProfile.age}, goal "${userProfile.primaryGoal}", ${userProfile.riskTolerance} risk profile) and real spending numbers.

Respond ONLY with a perfectly formatted JSON object containing EXACTLY these keys:
{
  "monthlySummary": "A highly detailed, encouraging, and analytical summary (3-4 sentences) of their current financial health, mentioning their specific numbers, primary goal, and biggest spending areas.",
  "savingSuggestions": [
    "A highly specific, actionable saving tip based on their top expense category or budget limits",
    "A personalized suggestion on how to improve their current savings rate of ${ctx.savingsRate}% while protecting their emergency fund",
    "A practical daily/weekly habit change tailored to their recent transactions and fixed costs"
  ],
  "growthIdea": "A specific wealth-building or investment strategy tailored to their age (${userProfile.age}), ${userProfile.riskTolerance} risk profile, and primary goal of ${userProfile.primaryGoal}. Be specific about where they should put their monthly surplus of ₹${ctx.netSavings}."
}`;

        let rawText = await callGeminiREST(prompt, true);

        if (rawText) {
          const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed.monthlySummary) monthlySummary = parsed.monthlySummary;
          if (Array.isArray(parsed.savingSuggestions) && parsed.savingSuggestions.length > 0) savingSuggestions = parsed.savingSuggestions;
          if (parsed.growthIdea) growthIdea = parsed.growthIdea;
        }
      } catch (aiErr) {
        console.warn('Gemini insights fallback:', aiErr?.message);
      }

      return {
        income: ctx.totalIncome,
        expense: ctx.totalExpense,
        savings: ctx.netSavings,
        savingsRate: ctx.savingsRate,
        monthlySummary,
        savingSuggestions,
        growthIdea,
        insights: [{
          title: `Savings Rate: ${ctx.savingsRate}%`,
          description: ctx.netSavings >= 0
            ? `Great job! You saved ₹${ctx.netSavings.toLocaleString('en-IN')} this period.`
            : `Warning: Expenses exceed income by ₹${Math.abs(ctx.netSavings).toLocaleString('en-IN')}.`,
          type: ctx.netSavings >= 0 ? "SUCCESS" : "WARNING"
        }]
      };
    } catch (e) {
      console.error('Error fetching insights:', e);
      return {
        income: 0, expense: 0, savings: 0, savingsRate: '0.0',
        monthlySummary: "Welcome to FinMitra! Log your income and expenses to generate live AI financial insights.",
        savingSuggestions: ["Log your first transaction to get personalized advice."],
        growthIdea: "Start by tracking daily expenses.",
        insights: []
      };
    }
  },

  sendMessage: async (message) => {
    // 1. Try Java Backend first (API keys stay private on server, 100% hidden from Network tab)
    try {
      const backendRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message ? message.trim() : '' })
      });
      if (backendRes.ok) {
        const data = await backendRes.json();
        if (data && data.reply) {
          return { response: data.reply, reply: data.reply };
        }
      }
    } catch (backendErr) {
      console.warn('Backend /api/ai/chat unreachable, using client fallback:', backendErr);
    }

    let transactions = [];
    let budgets = [];
    let userProfile = null;
    try {
      transactions = await transactionApi.getTransactions();
      budgets = await budgetApi.getBudgets();
      userProfile = profileApi.getUserProfile();
    } catch (e) {
      console.warn('Could not fetch context:', e);
      userProfile = profileApi.getUserProfile();
    }

    const ctx = buildFinancialContext(transactions, budgets);

    // 1. Try Gemini REST API first
    try {
      const contextData = JSON.stringify({
        userProfile: {
          fullName: userProfile.fullName,
          age: userProfile.age,
          occupation: userProfile.occupation,
          riskTolerance: userProfile.riskTolerance,
          investmentHorizon: userProfile.investmentHorizon,
          primaryGoal: userProfile.primaryGoal,
          targetGoalAmount: userProfile.targetGoalAmount,
          targetRetirementAge: userProfile.targetRetirementAge,
          monthlyIncome: userProfile.monthlyIncome || ctx.totalIncome,
          monthlyFixedExpenses: userProfile.monthlyFixedExpenses,
          monthlyEMIs: userProfile.monthlyEMIs,
          dependents: userProfile.dependents,
          emergencyFundMonths: userProfile.emergencyFundMonths
        },
        liveFinancials: {
          totalIncome: ctx.totalIncome,
          totalExpense: ctx.totalExpense,
          netSavings: ctx.netSavings,
          savingsRate: ctx.savingsRate,
          topCategory: ctx.topCat,
          recentTransactions: transactions.slice(0, 10),
          budgets
        }
      });

      const prompt = `You are FinMitra AI Assistant, an expert personal finance & wealth management adviser.

User's Profile & Live Financial Context:
${contextData}

User Question: "${message}"

Instructions:
1. Answer ANY financial question (SIPs, investments, savings goals, EMI, tax, budgets, loans, insurance, retirement, portfolio allocation) with high accuracy.
2. Actively utilize the user's Profile & Goals in your response:
   - Full Name: ${userProfile.fullName}
   - Age: ${userProfile.age} (Use standard 100 - age asset allocation: ${Math.max(20, Math.min(85, 100 - userProfile.age))}% Equity / ${100 - Math.max(20, Math.min(85, 100 - userProfile.age))}% Debt)
   - Risk Tolerance: ${userProfile.riskTolerance}
   - Primary Goal: ${userProfile.primaryGoal} (Target: ₹${userProfile.targetGoalAmount})
   - Retirement Target: Age ${userProfile.targetRetirementAge} (${Math.max(1, userProfile.targetRetirementAge - userProfile.age)} years to retirement)
   - Monthly Income: ₹${userProfile.monthlyIncome || ctx.totalIncome}
   - Fixed Living Expenses: ₹${userProfile.monthlyFixedExpenses} (Emergency fund target: 6 months = ₹${userProfile.monthlyFixedExpenses * 6})
   - Existing EMIs: ₹${userProfile.monthlyEMIs} (Debt-To-Income DTI: ${userProfile.monthlyIncome > 0 ? ((userProfile.monthlyEMIs / userProfile.monthlyIncome) * 100).toFixed(1) : '0.0'}%)
   - Dependents: ${userProfile.dependents}
3. Always incorporate the user's REAL financial data and profile numbers into your response.
4. If the user asks a saving goal question (e.g. "save 1 lakh in 3 months"), calculate the exact monthly saving needed and compare with their current surplus.
5. If the user asks about their profile, goals, asset allocation, or retirement, provide concrete calculations using their profile parameters.
6. If the question is NOT about finance at all, politely say you specialize only in personal finance.
7. DO NOT use any markdown formatting (no asterisks *, no hashtags #).
8. DO NOT use any emojis. Use plain text only. Keep responses concise but comprehensive.`;

      let aiResponse = await callGeminiREST(prompt, false);

      if (aiResponse) {
        return { response: aiResponse, reply: aiResponse };
      }
    } catch (err) {
      console.warn('Gemini chat fallback activated:', err?.message);
    }

    // 2. Smart financial advisor fallback
    const reply = smartFinancialAdvisor(message, ctx, userProfile);
    return { response: reply, reply };
  },

  parseReceiptImage: async (base64Image, mimeType) => {
    const prompt = `You are an expert OCR financial receipt and bill parser. Analyze the uploaded bill or receipt image with high precision and extract the transaction details.

CRITICAL INSTRUCTIONS FOR MERCHANT / STORE / RESTAURANT / PLACE NAME:
1. Identify the EXACT establishment, restaurant, shop, cafe, store, business, or vendor name where the money was spent (e.g. "The Lake Hill", "Starbucks", "D-Mart", "McDonald's").
2. Look at the very top of the bill/receipt header, title, or logo above the address, phone number, GSTIN, table number, or itemized list.
3. NEVER return "Unknown Merchant" or generic descriptions like "Receipt" if any place or business title is visible.
4. If there is a business email (e.g. reservation@thelakehill.com), phone, or website, use it to assist in determining the exact establishment name.

CRITICAL INSTRUCTIONS FOR AMOUNT:
1. Extract the final payable total amount paid (look for "Total", "Grand Total", "Due", "Bill Amount", or final printed ₹/Rs figure).
2. Return a pure number (e.g. 1650 for 1,650.00 Rs).

CRITICAL INSTRUCTIONS FOR CATEGORY:
Select the single most accurate category from:
- "Food" (Restaurants, Cafes, Groceries, Dining, Food delivery, Eateries)
- "Travel & Transport" (Fuel, Taxi, Cab, Auto, Metro, Flight, Train, Parking)
- "Online Shopping" (E-commerce, Clothing, Electronics, Personal items)
- "Utilities" (Electricity, Water, Gas, Mobile, Internet, Wi-Fi)
- "Entertainment" (Movies, Streaming, Gaming, Events)
- "Health" (Pharmacy, Doctor, Hospital, Medicines)
- "Rent"
- "Salary"
- "Other"

Return ONLY a valid JSON object matching this structure:
{
  "merchant": "Exact business/place name (e.g. The Lake Hill)",
  "note": "Exact business/place name (e.g. The Lake Hill)",
  "amount": 1650,
  "category": "Food",
  "date": "YYYY-MM-DD",
  "type": "EXPENSE"
}

Format date strictly as YYYY-MM-DD (e.g. "2024-08-16").
Do not wrap in extra explanation. Return valid JSON only.`;

    // 1. Try Java Backend first (API keys stay private on server, 100% hidden from Network tab)
    try {
      const backendRes = await fetch('/api/ai/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image, mimeType: mimeType || 'image/jpeg' })
      });
      if (backendRes.ok) {
        const data = await backendRes.json();
        if (data && (data.merchant || data.amount !== undefined)) {
          return {
            merchant: data.merchant || 'Store / Merchant',
            note: data.note || data.merchant || 'Receipt Expense',
            amount: parseFloat(data.amount) || 0,
            category: data.category || 'Food',
            date: data.date || new Date().toISOString().split('T')[0],
            type: (data.type || 'EXPENSE').toUpperCase()
          };
        }
      }
    } catch (backendErr) {
      console.warn('Backend /api/ai/parse-receipt unreachable, using client fallback:', backendErr);
    }

    try {
      let aiResponse = await callGeminiREST(prompt, true, base64Image, mimeType);

      if (aiResponse) {
        const cleanStr = aiResponse.replace(/```json\n?|```/g, '').trim();
        const jsonMatch = cleanStr.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleanStr);

        const merchant = (parsed.merchant || parsed.store || parsed.vendor || parsed.place || parsed.business || parsed.name || '').trim();
        const note = (parsed.note || merchant || parsed.description || 'Receipt Expense').trim();

        return {
          merchant: merchant || note || 'Store / Merchant',
          note: note || merchant || 'Receipt Expense',
          amount: parseFloat(parsed.amount) || 0,
          category: parsed.category || 'Food',
          date: parsed.date || new Date().toISOString().split('T')[0],
          type: (parsed.type || 'EXPENSE').toUpperCase()
        };
      }
    } catch (err) {
      console.error('Error parsing receipt with Gemini:', err);
    }
    return null;
  }
};
