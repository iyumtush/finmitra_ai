import { transactionApi } from './transactionApi';
import { budgetApi } from './budgetApi';

// ─── Gemini REST API (bypasses npm package v1beta issues) ───
const getGeminiKeys = () => {
  const raw = (
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    import.meta.env.GEMINI_API_KEY ||
    ''
  ).trim();
  // Support multiple keys separated by commas
  return raw.replace(/^["']|["']$/g, '').split(',').map(k => k.trim()).filter(Boolean);
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

  const models = ['antigravity-preview-05-2026', 'deep-research-preview-04-2026', 'gemini-1.5-flash', 'gemini-1.5-pro'];
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
            inline_data: {
              mime_type: mimeType,
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
            'Content-Type': 'application/json',
            'x-goog-api-key': key
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

// ─── Grok REST API (Fallback) ───
const callGrokREST = async (prompt, isJson = false, base64Image = null, mimeType = 'image/jpeg') => {
  const key = getGrokKey();
  if (!key) return null;

  try {
    const url = 'https://api.x.ai/v1/chat/completions';
    const content = [];

    if (base64Image) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64Image}`
        }
      });
    }
    content.push({ type: "text", text: prompt });

    const contentStrOrArr = base64Image ? content : prompt;

    const body = {
      messages: [
        {
          role: "user",
          content: contentStrOrArr
        }
      ],
      model: base64Image ? "grok-2-vision-latest" : "grok-2-latest",
      stream: false,
      temperature: 0.7
    };

    if (isJson) {
      // Grok may not support strict response_format yet, but we prompt it.
      // We will just parse the string safely.
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Grok returned ${res.status}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (text) return text;
  } catch (err) {
    console.warn('Grok REST call failed:', err.message);
  }
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
const smartFinancialAdvisor = (message, ctx) => {
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
  const financeWords = ['sip', 'invest', 'rupee', 'rs', '₹', 'money', 'budget', 'expense', 'income', 'bank', 'tax', 'loan', 'cost', 'pay', 'buy', 'afford', 'save', 'saving', 'salary', 'emi', 'fd', 'mutual', 'stock', 'nifty', 'lakh', 'crore', 'interest', 'return', 'profit', 'loss', 'debt', 'credit', 'insurance', 'goal', 'plan', 'month', 'year', 'spend', 'finance', 'wealth', 'portfolio', 'asset'];
  const isNonFinance = nonFinanceWords.some(k => text.includes(k)) && !financeWords.some(k => text.includes(k));

  if (isNonFinance) {
    return ` FinMitra AI Assistant: I specialize in personal finance, investments, budgets, savings, and wealth management. Please ask me a finance-related question!`;
  }

  // ── Saving Goal / Target Questions ──
  if ((text.includes('save') || text.includes('saving') || text.includes('make') || text.includes('goal') || text.includes('target') || text.includes('reach') || text.includes('accumulate') || text.includes('need')) && targetAmount > 0) {
    const effectiveMonths = months || 3; // default 3 months
    const monthlySavingNeeded = Math.ceil(targetAmount / effectiveMonths);
    const gap = monthlySavingNeeded - netSavings;
    const isAchievable = netSavings >= monthlySavingNeeded;

    let advice = ` Financial Goal Analysis: Goal: Save ₹${targetAmount.toLocaleString('en-IN')} in ${effectiveMonths} months

 Your Current Financials: - Monthly Income: ₹${totalIncome.toLocaleString('en-IN')}
- Monthly Expenses: ₹${totalExpense.toLocaleString('en-IN')}
- Current Monthly Surplus: ₹${netSavings.toLocaleString('en-IN')} (${savingsRate}% savings rate)

 Monthly Savings Required: ₹${monthlySavingNeeded.toLocaleString('en-IN')}/month\n`;

    if (isAchievable) {
      advice += `\n This goal is achievable! You save ₹${netSavings.toLocaleString('en-IN')}/month, which is more than the required ₹${monthlySavingNeeded.toLocaleString('en-IN')}/month.
- You'll still have ₹${(netSavings - monthlySavingNeeded).toLocaleString('en-IN')}/month remaining after setting aside the goal amount.

 Tip: Park these savings in a high-yield savings account or liquid fund to earn interest while you save!`;
    } else {
      advice += `\n Stretch Goal: You need ₹${monthlySavingNeeded.toLocaleString('en-IN')}/month but currently save ₹${netSavings.toLocaleString('en-IN')}/month.
- Shortfall: ₹${gap.toLocaleString('en-IN')}/month

 Action Plan to Bridge the Gap: - Reduce ${topCat} expenses (currently ₹${topCatAmount.toLocaleString('en-IN')}) by ₹${Math.min(gap, topCatAmount).toLocaleString('en-IN')}/month.
- Extend the timeline to ${Math.ceil(targetAmount / netSavings)} months to comfortably reach your goal.
- Consider a short-term FD or Recurring Deposit for disciplined saving.`;
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
      const ctx = buildFinancialContext(transactions, budgets);

      let monthlySummary = `You earned ₹${ctx.totalIncome.toLocaleString('en-IN')} and spent ₹${ctx.totalExpense.toLocaleString('en-IN')}, saving ₹${ctx.netSavings.toLocaleString('en-IN')} (${ctx.savingsRate}% savings rate).`;
      let savingSuggestions = [
        "Aim to allocate at least 20% of your income into emergency funds or SIPs.",
        "Review top recurring expense categories to identify unnecessary costs.",
        "Maintain a liquid emergency buffer covering 3-6 months of essential living expenses."
      ];
      let growthIdea = "Consider investing your monthly net savings into low-cost Nifty 50 Index Funds or High-Yield Fixed Deposits to beat inflation.";

      // Try Gemini REST API for richer insights
      try {
        const prompt = `You are FinMitra AI Assistant, an expert wealth manager. Analyze this user financial data:
Income: ₹${ctx.totalIncome}, Expenses: ₹${ctx.totalExpense}, Net Savings: ₹${ctx.netSavings}, Savings Rate: ${ctx.savingsRate}%
Recent Transactions: ${JSON.stringify(transactions.slice(0, 10))}
Budgets: ${JSON.stringify(budgets)}

Respond ONLY with a valid JSON object:
{"monthlySummary":"2-sentence financial summary","savingSuggestions":["tip1","tip2","tip3"],"growthIdea":"investment strategy"}`;

        let rawText = await callGeminiREST(prompt, true);
        
        // Fallback to Grok if Gemini fails
        if (!rawText) {
          console.warn('Switching to Grok API for insights...');
          rawText = await callGrokREST(prompt, true);
        }

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
    let transactions = [];
    let budgets = [];
    try {
      transactions = await transactionApi.getTransactions();
      budgets = await budgetApi.getBudgets();
    } catch (e) {
      console.warn('Could not fetch context:', e);
    }

    const ctx = buildFinancialContext(transactions, budgets);

    // 1. Try Gemini REST API first
    try {
      const contextData = JSON.stringify({
        totalIncome: ctx.totalIncome,
        totalExpense: ctx.totalExpense,
        netSavings: ctx.netSavings,
        savingsRate: ctx.savingsRate,
        topCategory: ctx.topCat,
        recentTransactions: transactions.slice(0, 10),
        budgets
      });

      const prompt = `You are FinMitra AI Assistant, an expert personal finance & wealth management adviser.

User's Live Financial Context:
${contextData}

User Question: "${message}"

Instructions:
1. Answer ANY financial question (SIPs, investments, savings goals, EMI, tax, budgets, loans, insurance, spending analysis) with high accuracy.
2. Always incorporate the user's REAL financial data (Income: ₹${ctx.totalIncome}, Expenses: ₹${ctx.totalExpense}, Net Savings: ₹${ctx.netSavings}/month) into your response.
3. If the user asks a saving goal question (e.g. "save 1 lakh in 3 months"), calculate the exact monthly saving needed and compare with their current surplus.
4. If the question is NOT about finance at all, politely say you specialize only in personal finance.
5. DO NOT use any markdown formatting (no asterisks *, no hashtags #).
6. DO NOT use any emojis. Use plain text only. Keep responses concise but comprehensive.`;

      let aiResponse = await callGeminiREST(prompt, false);
      
      // Fallback to Grok if Gemini fails
      if (!aiResponse) {
        console.warn('Switching to Grok API for chat...');
        aiResponse = await callGrokREST(prompt, false);
      }

      if (aiResponse) {
        return { response: aiResponse, reply: aiResponse };
      }
    } catch (err) {
      console.warn('Gemini chat fallback activated:', err?.message);
    }

    // 2. Smart financial advisor fallback
    const reply = smartFinancialAdvisor(message, ctx);
    return { response: reply, reply };
  },

  parseReceiptImage: async (base64Image, mimeType) => {
    const prompt = `You are a financial receipt parser. Analyze the uploaded receipt image and extract the transaction details.
Return ONLY a valid JSON object with the following keys exactly:
- "amount": The total numerical amount paid (number). E.g. 500. Return 0 if not found.
- "category": Categorize the transaction into one of these: Food, Transport, Utilities, Shopping, Salary, Investment, Rent, Entertainment, Health, Other.
- "note": A short description of the purchase (string).
- "type": "expense" if money was paid, or "income" if money was received.
- "date": The date of the transaction in YYYY-MM-DD format (string). Default to today's date if not visible.

Make sure the output is perfectly valid JSON without any markdown formatting wrappers around it.`;

    try {
      let aiResponse = await callGeminiREST(prompt, true, base64Image, mimeType);
      
      // Fallback to Grok Vision if Gemini fails
      if (!aiResponse) {
        console.warn('Switching to Grok Vision API for receipt parsing...');
        aiResponse = await callGrokREST(prompt, true, base64Image, mimeType);
      }

      if (aiResponse) {
        // Strip markdown backticks if Gemini still added them despite responseMimeType=application/json
        const jsonString = aiResponse.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(jsonString);
      }
    } catch (err) {
      console.error('Error parsing receipt with Gemini:', err);
    }
    return null;
  }
};
