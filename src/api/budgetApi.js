import { supabase } from '../supabaseClient';
import { transactionApi } from './transactionApi';

export const budgetApi = {
  getBudgets: async () => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*');

    if (error) throw error;
    
    // Fetch transactions to calculate spent amounts dynamically
    let transactions = [];
    try {
      transactions = await transactionApi.getTransactions();
    } catch(e) {
      console.warn("Failed to fetch transactions for budget calculation", e);
    }
    
    // Sum expenses per category
    const spentPerCategory = {};
    transactions.forEach(t => {
      if (t.type === 'EXPENSE') {
        const cat = t.category;
        spentPerCategory[cat] = (spentPerCategory[cat] || 0) + Number(t.amount || 0);
      }
    });

    return (data || []).map(b => ({
      ...b,
      limitAmount: b.limit_amount,
      spentAmount: spentPerCategory[b.category] || 0
    }));
  },

  setBudget: async (budgetData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('budgets')
      .upsert([
        {
          user_id: user.id,
          category: budgetData.category,
          limit_amount: budgetData.limitAmount
        }
      ], { onConflict: 'user_id, category' })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      limitAmount: data.limit_amount
    };
  }
};
