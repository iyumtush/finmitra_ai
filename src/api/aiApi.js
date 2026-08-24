import { GoogleGenerativeAI } from '@google/generative-ai';
import { transactionApi } from './transactionApi';
import { budgetApi } from './budgetApi';

const getGeminiKey = () => {
  const raw = (
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    import.meta.env.GEMINI_API_KEY ||
    ''
  ).trim();

  // Strip wrapping quotes if user typed "AIzaSy..." in Vercel settings
  return raw.replace(/^["']|["']$/g, '').trim();
};

const getGenAIClient = () => {
  const key = getGeminiKey();
  return key ? new GoogleGenerativeAI(key) : null;
};

const generateGeminiContent = async (genAI, prompt, isJson = false) => {
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash-latest'
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        ...(isJson ? { generationConfig: { responseMimeType: "application/json" } } : {})
      });
      const result = await model.generateContent(prompt);
      const text = result.response?.text();
      if (text) return text;
    } catch (err) {
      lastError = err;
    }

    if (isJson) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response?.text();
        if (text) return text;
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error("Gemini API call failed");
};

export const aiApi = {
  getInsights: async () => {
    try {
      const transactions = await transactionApi.getTransactions();
      const budgets = await budgetApi.getBudgets();

      const totalIncome = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const totalExpense = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const netSavings = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0.0';

      let monthlySummary = `You earned ₹${totalIncome.toLocaleString('en-IN')} and spent ₹${totalExpense.toLocaleString('en-IN')}, saving ₹${netSavings.toLocaleString('en-IN')} (${savingsRate}% savings rate).`;
      let savingSuggestions = [
        "Aim to allocate at least 20% of your income into emergency funds or SIPs.",
        "Review top recurring expense categories to identify unnecessary costs.",
        "Maintain a liquid emergency buffer covering 3-6 months of essential living expenses."
      ];
      let growthIdea = "Consider investing your monthly net savings into low-cost Nifty 50 Index Funds or High-Yield Fixed Deposits to beat inflation.";

      const genAI = getGenAIClient();
      if (genAI) {
        try {
          const prompt = `You are FinMitra AI Assistant, an expert wealth manager. Analyze this user financial data:
Income: ₹${totalIncome}
Expenses: ₹${totalExpense}
Net Savings: ₹${netSavings}
Savings Rate: ${savingsRate}%
Recent Transactions: ${JSON.stringify(transactions.slice(0, 10))}
Budgets: ${JSON.stringify(budgets)}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "monthlySummary": "A concise 2-sentence breakdown of their spending patterns and financial health.",
  "savingSuggestions": ["Actionable tip 1", "Actionable tip 2", "Actionable tip 3"],
  "growthIdea": "A smart investment or wealth growth strategy based on their current net savings."
}`;

          const rawText = await generateGeminiContent(genAI, prompt, true);
          const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          if (parsed.monthlySummary) monthlySummary = parsed.monthlySummary;
          if (Array.isArray(parsed.savingSuggestions) && parsed.savingSuggestions.length > 0) {
            savingSuggestions = parsed.savingSuggestions;
          }
          if (parsed.growthIdea) growthIdea = parsed.growthIdea;
        } catch (aiError) {
          console.warn('Gemini AI Insights fallback activated:', aiError?.message || aiError);
        }
      }

      return {
        income: totalIncome,
        expense: totalExpense,
        savings: netSavings,
        savingsRate,
        monthlySummary,
        savingSuggestions,
        growthIdea,
        insights: [
          {
            title: `Savings Rate: ${savingsRate}%`,
            description: netSavings >= 0
              ? `Great job! You saved ₹${netSavings.toLocaleString('en-IN')} this period.`
              : `Warning: Expenses exceed income by ₹${Math.abs(netSavings).toLocaleString('en-IN')}.`,
            type: netSavings >= 0 ? "SUCCESS" : "WARNING"
          }
        ]
      };
    } catch (e) {
      console.error('Error fetching insights:', e);
      return {
        income: 0,
        expense: 0,
        savings: 0,
        savingsRate: '0.0',
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
      console.warn('Could not fetch context for chat:', e);
    }

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
    const topCat = Object.keys(catSpends).sort((a, b) => catSpends[b] - catSpends[a])[0] || 'General';
    const topCatAmount = catSpends[topCat] || 0;

    // 1. Attempt Gemini AI
    const genAI = getGenAIClient();
    if (genAI) {
      try {
        const contextSummary = JSON.stringify({
          totalIncome,
          totalExpense,
          netSavings,
          savingsRate,
          topCategory: topCat,
          topCategoryExpense: topCatAmount,
          recentTransactions: transactions.slice(0, 10),
          budgetLimits: budgets
        });

        const systemPrompt = `You are FinMitra AI Assistant, an expert personal wealth manager and financial adviser.
User Financial Data Context: ${contextSummary}

User Question: ${message}

Instructions:
1. Answer ANY financial, investment, SIP, budgeting, loan, tax, savings, or spending question with high financial accuracy.
2. Seamlessly integrate the user's real financial context (Income: ₹${totalIncome}, Expenses: ₹${totalExpense}, Net Savings: ₹${netSavings}, Savings Rate: ${savingsRate}%) into your advice.
3. If the user asks a non-financial question (e.g. sports, movies, coding, recipes, weather), politely decline and state that you are specialized exclusively in personal finance and wealth management.
4. Format your answer with clean Markdown headers and bullet points.`;

        const responseText = await generateGeminiContent(genAI, systemPrompt, false);
        if (responseText) {
          return { response: responseText, reply: responseText };
        }
      } catch (err) {
        console.warn('Gemini Chat API Error, activating intelligent fallback adviser:', err?.message || err);
      }
    }

    // 2. Flexible Intelligent Financial Fallback Engine
    const text = message.toLowerCase().trim();

    // Check for non-finance topics
    const nonFinanceKeywords = ['weather', 'recipe', 'movie', 'game', 'football', 'cricket', 'who is', 'python', 'java', 'code', 'song', 'joke'];
    const isNonFinance = nonFinanceKeywords.some(k => text.includes(k)) && 
      !['sip', 'invest', 'rupee', 'rs', 'money', 'budget', 'expense', 'income', 'bank', 'tax', 'loan', 'cost', 'pay', 'buy', 'afford'].some(k => text.includes(k));

    if (isNonFinance) {
      const nonFinReply = `🤖 **FinMitra AI Assistant**: I am specialized as your personal financial adviser. I can only assist with personal finance, investments, budgets, savings, and wealth questions!`;
      return { response: nonFinReply, reply: nonFinReply };
    }

    // Extract numerical amounts from query (e.g. "sip of 5000", "buy car for 500000")
    const numberMatches = text.match(/[\d,]+/g);
    let queriedAmount = 0;
    if (numberMatches && numberMatches.length > 0) {
      queriedAmount = parseInt(numberMatches[0].replace(/,/g, ''), 10) || 0;
    }

    let reply = "";

    // SIP / Investment / Mutual Fund Query
    if (text.includes("sip") || text.includes("mutual fund") || text.includes("invest") || text.includes("stock") || text.includes("nifty") || text.includes("fd")) {
      if (queriedAmount > 0) {
        if (queriedAmount <= netSavings) {
          const percentOfSavings = ((queriedAmount / (netSavings || 1)) * 100).toFixed(0);
          reply = `📈 **SIP / Investment Recommendation**:
Yes! Starting a SIP of **₹${queriedAmount.toLocaleString('en-IN')}** per month is a fantastic financial decision!

- **Your Net Monthly Savings**: ₹${netSavings.toLocaleString('en-IN')} (${savingsRate}% savings rate)
- **SIP Allocation**: ₹${queriedAmount.toLocaleString('en-IN')} (~${percentOfSavings}% of your net savings)
- **Remaining Emergency Buffer**: ₹${(netSavings - queriedAmount).toLocaleString('en-IN')}/month.

💡 **Strategy**: Consider allocating this SIP into low-cost Nifty 50 Index Funds or Flexi-Cap Funds for steady long-term compounding!`;
        } else {
          reply = `⚠️ **SIP / Investment Caution**:
A monthly SIP of **₹${queriedAmount.toLocaleString('en-IN')}** exceeds your current net monthly savings of **₹${netSavings.toLocaleString('en-IN')}**.

💡 **Recommendation**: Consider starting with a smaller SIP of **₹${(Math.max(1000, Math.floor(netSavings * 0.3))).toLocaleString('en-IN')}** (~30% of your surplus) to maintain liquid cash reserves!`;
        }
      } else {
        reply = `📈 **Investment Guidance**:
Based on your net monthly surplus of **₹${netSavings.toLocaleString('en-IN')}** (${savingsRate}% savings rate):

- **Recommended SIP**: Allocate 20% to 50% of monthly savings (**₹${(Math.floor(netSavings * 0.3)).toLocaleString('en-IN')}/month**) into index funds.
- **Emergency Reserve**: Keep 3-6 months of expenses (**₹${(totalExpense * 3).toLocaleString('en-IN')}**) in liquid FDs.`;
      }
    }
    // Purchasing / Buying / Affordability Query
    else if (text.includes("buy") || text.includes("afford") || text.includes("purchase") || text.includes("car") || text.includes("phone") || text.includes("bike")) {
      if (queriedAmount > 0) {
        const monthsNeeded = (queriedAmount / (netSavings || 1)).toFixed(1);
        reply = `🛒 **Affordability Analysis**:
For a purchase costing **₹${queriedAmount.toLocaleString('en-IN')}**:

- **Your Net Monthly Surplus**: ₹${netSavings.toLocaleString('en-IN')}
- **Time to Save**: ~**${monthsNeeded} months** of net savings.
- **Financial Tip**: Ensure your emergency fund of **₹${(totalExpense * 3).toLocaleString('en-IN')}** remains intact before allocating funds to non-essentials.`;
      } else {
        reply = `🛒 **Purchase Guidance**:
Before making major purchases:
1. Ensure your liquid emergency fund (**₹${(totalExpense * 3).toLocaleString('en-IN')}**) is untouched.
2. Use your net surplus (**₹${netSavings.toLocaleString('en-IN')}/month**) to build a target savings goal first!`;
      }
    }
    // Expense Queries
    else if (text.includes("expense") || text.includes("spent") || text.includes("cost")) {
      reply = `📊 **Expense Overview**:
- **Total Expenses**: **₹${totalExpense.toLocaleString('en-IN')}**
- **Top Spending Category**: **${topCat}** (**₹${topCatAmount.toLocaleString('en-IN')}**)
- **Expense Ratio**: ${totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : 0}% of income.`;
    }
    // Income / Salary Queries
    else if (text.includes("income") || text.includes("salary") || text.includes("earn")) {
      reply = `💵 **Income Overview**:
- **Total Income**: **₹${totalIncome.toLocaleString('en-IN')}**
- **Net Monthly Savings**: **₹${netSavings.toLocaleString('en-IN')}** (${savingsRate}% savings rate)`;
    }
    // Budget Queries
    else if (text.includes("budget") || text.includes("limit") || text.includes("cap")) {
      const overBudgets = budgets.filter(b => (catSpends[b.category] || 0) > Number(b.limitAmount || 0));
      if (overBudgets.length > 0) {
        reply = `⚠️ **Budget Alert**: You have exceeded your budget cap in: ${overBudgets.map(b => `${b.category} (Limit: ₹${b.limitAmount})`).join(', ')}.`;
      } else {
        reply = `✅ **Budget Status**: Great job! All category expenses are within your set budget caps.`;
      }
    }
    // General / Any Other Financial Query
    else {
      reply = `💡 **FinMitra Financial Assistant**:
- **Income**: ₹${totalIncome.toLocaleString('en-IN')} | **Expense**: ₹${totalExpense.toLocaleString('en-IN')}
- **Net Monthly Surplus**: ₹${netSavings.toLocaleString('en-IN')} (${savingsRate}% savings rate)

I am ready to help with any financial question! Try asking:
- *"Should I start a SIP of ₹5000?"*
- *"Can I afford a purchase of ₹30000?"*
- *"How can I improve my savings rate?"*
- *"Which is my top expense category?"*`;
    }

    return { response: reply, reply };
  }
};
