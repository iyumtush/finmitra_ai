import { GoogleGenerativeAI } from '@google/generative-ai';
import { transactionApi } from './transactionApi';
import { budgetApi } from './budgetApi';

const getGeminiKey = () => {
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    import.meta.env.GEMINI_API_KEY ||
    ''
  ).trim();
};

const getGenAIClient = () => {
  const key = getGeminiKey();
  return key ? new GoogleGenerativeAI(key) : null;
};

const generateGeminiContent = async (genAI, prompt, isJson = false) => {
  const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-pro'];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: isJson ? { responseMimeType: "application/json" } : {}
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text) return text;
    } catch (err) {
      lastError = err;
      console.warn(`Gemini model ${modelName} call failed, trying fallback:`, err?.message || err);
    }
  }

  throw lastError || new Error("All Gemini models failed");
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
          console.error('Gemini AI Insights Error:', aiError);
        }
      } else {
        console.warn('VITE_GEMINI_API_KEY is missing. Using rule-based financial advice fallback.');
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
    try {
      const genAI = getGenAIClient();
      if (genAI) {
        const transactions = await transactionApi.getTransactions();
        const budgets = await budgetApi.getBudgets();

        const contextSummary = JSON.stringify({
          recentTransactions: transactions.slice(0, 15),
          budgetLimits: budgets
        });

        const systemPrompt = `You are FinMitra AI Agent, an intelligent personal financial adviser.
User Financial Data Context: ${contextSummary}

User Question: ${message}

Provide clear, professional, actionable financial guidance in markdown format with helpful bullet points.`;

        const responseText = await generateGeminiContent(genAI, systemPrompt, false);
        return { response: responseText };
      }
    } catch (err) {
      console.error('Gemini API Agent Error:', err);
    }

    const text = message.toLowerCase();
    let reply = "I am your FinMitra Financial Adviser AI. Please set VITE_GEMINI_API_KEY in your .env file or Vercel Environment Variables to enable live Gemini AI agent responses!";

    if (text.includes("save") || text.includes("savings")) {
      reply = "To maximize your savings, adopt the 50/30/20 rule: 50% for Needs, 30% for Wants, and 20% dedicated directly to SIPs & Emergency Funds.";
    } else if (text.includes("budget") || text.includes("limit")) {
      reply = "You can set custom budget caps per category in the Budgets section. FinMitra automatically alerts you when category spending reaches 80%.";
    } else if (text.includes("invest") || text.includes("stocks")) {
      reply = "Consider allocating a portion of monthly surplus to index funds (Nifty 50) and high-yield instruments before taking individual equity risks.";
    }

    return { response: reply };
  }
};
