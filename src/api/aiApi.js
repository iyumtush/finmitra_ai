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
  // Use recommended production models for Google AI Studio
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash-latest'
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    // Attempt 1: Try with JSON schema format if requested
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

    // Attempt 2: Fallback without JSON schema config if model didn't support responseMimeType
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
          const prompt = `You are FinMitra AI, an expert wealth manager. Analyze this user financial data:
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

    // Calculate highest spend category
    const catSpends = {};
    transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      catSpends[t.category] = (catSpends[t.category] || 0) + Number(t.amount || 0);
    });
    const topCat = Object.keys(catSpends).sort((a, b) => catSpends[b] - catSpends[a])[0] || 'General';
    const topCatAmount = catSpends[topCat] || 0;

    // Attempt Gemini API call
    const genAI = getGenAIClient();
    if (genAI) {
      try {
        const contextSummary = JSON.stringify({
          totalIncome,
          totalExpense,
          netSavings,
          recentTransactions: transactions.slice(0, 10),
          budgetLimits: budgets
        });

        const systemPrompt = `You are FinMitra AI Agent, an intelligent personal financial adviser.
User Financial Data Context: ${contextSummary}

User Question: ${message}

Provide clear, professional, actionable financial guidance in markdown format with helpful bullet points.`;

        const responseText = await generateGeminiContent(genAI, systemPrompt, false);
        if (responseText) {
          return { response: responseText, reply: responseText };
        }
      } catch (err) {
        console.warn('Gemini Chat API Error, falling back to smart financial advisor calculation:', err?.message || err);
      }
    }

    // Context-aware Smart Financial Adviser Response
    const text = message.toLowerCase();
    let reply = "";

    if (text.includes("total expense") || text.includes("how much expense") || text.includes("spent")) {
      reply = `📊 **Total Expense**: Your total recorded expense is **₹${totalExpense.toLocaleString('en-IN')}** across ${transactions.filter(t => t.type === 'EXPENSE').length} logged transactions.`;
    } else if (text.includes("highest spend") || text.includes("top category") || text.includes("most money")) {
      reply = `🏷️ **Highest Spending Category**: Your top expense category is **${topCat}** with **₹${topCatAmount.toLocaleString('en-IN')}** spent.`;
    } else if (text.includes("over budget") || text.includes("budget status") || text.includes("budget limit")) {
      const overBudgets = budgets.filter(b => (catSpends[b.category] || 0) > Number(b.limitAmount || 0));
      if (overBudgets.length > 0) {
        reply = `⚠️ **Budget Alert**: You have exceeded your budget in: ${overBudgets.map(b => `${b.category} (Limit: ₹${b.limitAmount})`).join(', ')}.`;
      } else {
        reply = `✅ **Budget Status**: Great news! All your expenses are currently within your category budget caps.`;
      }
    } else if (text.includes("save") || text.includes("savings") || text.includes("advice") || text.includes("tip")) {
      reply = `💡 **Financial Advice**:
- **Current Net Savings**: ₹${netSavings.toLocaleString('en-IN')}
- Follow the **50/30/20 Rule**: 50% Needs, 30% Wants, 20% SIPs/Investments.
- Maintain a liquid emergency fund covering at least 3-6 months of expenses.`;
    } else {
      reply = `👋 **FinMitra Financial Summary**:
- **Income**: ₹${totalIncome.toLocaleString('en-IN')}
- **Expense**: ₹${totalExpense.toLocaleString('en-IN')}
- **Net Savings**: ₹${netSavings.toLocaleString('en-IN')}

Ask me questions like *"What is my total expense?"*, *"Which is my highest spend?"*, or *"Give me savings advice"*!`;
    }

    return { response: reply, reply };
  }
};
