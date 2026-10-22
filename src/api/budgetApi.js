/**
 * FinMitra Budget API (Java Spring Boot REST Connector)
 * Calls /api/budgets with Bearer JWT Authentication.
 */

import { transactionApi } from './transactionApi';

const getAuthHeaders = () => {
  const token = localStorage.getItem('finmitra_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const budgetApi = {
  getBudgets: async () => {
    let budgets = [];
    try {
      const res = await fetch('/api/budgets', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        budgets = await res.json();
      }
    } catch (err) {
      console.warn('Failed to fetch budgets from backend API:', err);
    }

    // Fetch transactions to compute spent amounts per category
    let transactions = [];
    try {
      transactions = await transactionApi.getTransactions();
    } catch (e) {
      console.warn('Failed to fetch transactions for budget calculation:', e);
    }

    const spentPerCategory = {};
    transactions.forEach((t) => {
      if (t.type === 'EXPENSE') {
        const cat = t.category;
        spentPerCategory[cat] = (spentPerCategory[cat] || 0) + Number(t.amount || 0);
      }
    });

    return (Array.isArray(budgets) ? budgets : []).map((b) => ({
      ...b,
      limitAmount: b.limitAmount !== undefined ? b.limitAmount : b.limit_amount,
      spentAmount: b.spentAmount !== undefined ? b.spentAmount : (spentPerCategory[b.category] || 0)
    }));
  },

  setBudget: async (budgetData) => {
    const body = {
      category: budgetData.category,
      limitAmount: parseFloat(budgetData.limitAmount || budgetData.amount)
    };

    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to save budget');
    }

    const data = await res.json();
    return {
      ...data,
      limitAmount: data.limitAmount !== undefined ? data.limitAmount : data.limit_amount
    };
  }
};
