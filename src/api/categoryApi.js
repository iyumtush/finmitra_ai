/**
 * FinMitra Category API (Java Spring Boot REST Connector)
 * Calls /api/categories with Bearer JWT Authentication.
 */

const getAuthHeaders = () => {
  const token = localStorage.getItem('finmitra_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const categoryApi = {
  getCategories: async () => {
    try {
      const res = await fetch('/api/categories', {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('Failed to fetch categories:', err);
      return [];
    }
  },

  createCategory: async (categoryData) => {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: categoryData.name,
        color: categoryData.color || '#6366f1'
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create category');
    }
    return await res.json();
  },

  deleteCategory: async (id) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete category');
    }
    return { success: true };
  }
};
