/**
 * FinMitra Transaction API (Java Spring Boot REST Connector)
 * Calls /api/transactions with Bearer JWT Authentication.
 */

const getAuthHeaders = () => {
  const token = localStorage.getItem('finmitra_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const transactionApi = {
  getTransactions: async () => {
    try {
      const res = await fetch('/api/transactions', {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return [];
        throw new Error(`Failed to fetch transactions: ${res.statusText}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('Error fetching transactions from backend:', err);
      return [];
    }
  },

  createTransaction: async (transactionData) => {
    const body = {
      amount: parseFloat(transactionData.amount),
      category: transactionData.category || 'Other',
      note: transactionData.note || transactionData.merchant || transactionData.description || 'Expense',
      type: (transactionData.type || 'EXPENSE').toUpperCase(),
      date: transactionData.date || new Date().toISOString().split('T')[0]
    };

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create transaction');
    }
    return await res.json();
  },

  updateTransaction: async (id, transactionData) => {
    const body = {
      amount: parseFloat(transactionData.amount),
      category: transactionData.category || 'Other',
      note: transactionData.note || transactionData.merchant || transactionData.description || 'Expense',
      type: (transactionData.type || 'EXPENSE').toUpperCase(),
      date: transactionData.date || new Date().toISOString().split('T')[0]
    };

    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update transaction');
    }
    return await res.json();
  },

  deleteTransaction: async (id) => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete transaction');
    }
    return { success: true };
  }
};
