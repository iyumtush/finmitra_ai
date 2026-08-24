import React, { useState, useEffect } from 'react';
import { budgetApi } from '../api/budgetApi';
import { categoryApi } from '../api/categoryApi';

const BUILT_IN_CATEGORIES = [
  'Food, Beverages & Groceries',
  'Travel & Transport',
  'Online Shopping',
  'Rent',
  'Utilities',
  'Entertainment',
  'Health',
  'To People'
];

export default function BudgetView() {
  const [budgets, setBudgets] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [categoryOption, setCategoryOption] = useState('Food, Beverages & Groceries');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [customCategoryColor, setCustomCategoryColor] = useState('#00E676');
  const [limit, setLimit] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bData, catData] = await Promise.all([
        budgetApi.getBudgets(),
        categoryApi.getCategories().catch(() => [])
      ]);
      setBudgets(bData);
      setCustomCategories(catData || []);
    } catch (err) {
      console.error('Failed to fetch budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingBudget(null);
    setCategoryOption('Food, Beverages & Groceries');
    setCustomCategoryInput('');
    setLimit('');
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (b) => {
    setEditingBudget(b);
    setCategoryOption(b.category);
    setCustomCategoryInput('');
    setLimit(b.limitAmount.toString());
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!limit) return;
    setErrorMsg('');

    let finalCategory = categoryOption;

    try {
      if (categoryOption === '__CUSTOM__') {
        if (!customCategoryInput.trim()) {
          setErrorMsg('Please enter a custom category name');
          return;
        }

        try {
          const newCat = await categoryApi.createCategory({
            name: customCategoryInput.trim(),
            color: customCategoryColor
          });
          finalCategory = newCat.name;
          setCustomCategories([...customCategories, newCat]);
        } catch (catErr) {
          finalCategory = customCategoryInput.trim();
        }
      }

      const payload = {
        category: finalCategory,
        limitAmount: parseFloat(limit)
      };

      await budgetApi.setBudget(payload);
      await fetchData();
      setLimit('');
      setShowModal(false);
      setEditingBudget(null);
    } catch (err) {
      console.error('Save Budget Error:', err);
      const backendMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save budget limit';
      setErrorMsg(backendMsg);
    }
  };

  const customNames = customCategories.map(c => c.name);
  const allCategoryOptions = Array.from(new Set([...BUILT_IN_CATEGORIES, ...customNames]));

  const getCategoryIcon = (cat) => {
    cat = (cat || '').toLowerCase();
    if (cat.includes('food') || cat.includes('dining')) return 'restaurant';
    if (cat.includes('travel') || cat.includes('transport')) return 'flight';
    if (cat.includes('software') || cat.includes('tech')) return 'computer';
    if (cat.includes('shop')) return 'shopping_bag';
    if (cat.includes('health') || cat.includes('med')) return 'medical_services';
    if (cat.includes('rent') || cat.includes('home')) return 'home';
    return 'receipt';
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-surface w-full h-full">
      <div className="max-w-[1440px] mx-auto h-full flex flex-col gap-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="font-headline-lg text-headline-lg text-primary">Monthly Budgets</h2>
          <button 
            onClick={openAddModal}
            className="px-4 py-2 bg-primary text-on-primary rounded-DEFAULT font-label-md text-label-md hover:bg-primary-container transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Set Budget Limit
          </button>
        </div>

        {/* Content Layout */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 min-h-[500px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-4 animate-spin">refresh</span>
              <p>Loading live budget data...</p>
            </div>
          ) : budgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-50">account_balance_wallet</span>
              <p className="font-body-md text-center max-w-sm">No monthly budget limits set yet. Click "Set Budget Limit" to configure your first category limit!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {budgets.map((b) => {
                const spent = Number(b.spentAmount || 0);
                const limitVal = Number(b.limitAmount || 0);
                const isOver = spent > limitVal;
                const pct = limitVal > 0 ? Math.min(100, (spent / limitVal) * 100) : 0;
                const diff = Math.abs(spent - limitVal);

                return (
                  <div key={b.id || b.category} className="border border-outline-variant rounded-xl p-5 hover:border-secondary transition-colors group relative overflow-hidden bg-surface-bright">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary group-hover:bg-white group-hover:text-secondary shrink-0 transition-colors">
                          <span className="material-symbols-outlined">{getCategoryIcon(b.category)}</span>
                        </div>
                        <div>
                          <h3 className="font-label-md text-primary font-bold">{b.category}</h3>
                          <p className="font-label-sm text-on-surface-variant">
                            {isOver ? 'Over budget' : `${pct.toFixed(0)}% used`}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => openEditModal(b)} 
                        className="text-on-surface-variant hover:text-secondary p-1"
                        title="Edit Budget Limit"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                    </div>

                    <div className="mb-2 flex justify-between items-end">
                      <div>
                        <span className="font-headline-md text-primary">₹{spent.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                      </div>
                      <span className="font-label-sm text-on-surface-variant">
                        of ₹{limitVal.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-surface-container-high rounded-full h-2 mb-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-error' : 'bg-secondary'}`} 
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>

                    {/* Alert Status Footer */}
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-outline-variant/50">
                      {isOver ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] text-error">error</span>
                          <span className="font-label-sm text-error">Over budget by ₹{diff.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                          <span className="font-label-sm text-secondary">₹{diff.toLocaleString('en-IN', {maximumFractionDigits: 0})} remaining</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Set / Edit Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b border-outline-variant">
              <h3 className="font-headline-md text-primary">
                {editingBudget ? `Edit ${editingBudget.category} Budget` : 'Set Monthly Budget'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveBudget} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block font-label-sm text-on-surface-variant mb-1">Category</label>
                <div className="relative">
                  <select 
                    value={categoryOption} 
                    onChange={(e) => setCategoryOption(e.target.value)} 
                    disabled={!!editingBudget}
                    className="w-full appearance-none px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary pr-10 disabled:opacity-50"
                  >
                    {allCategoryOptions.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                    <option value="__CUSTOM__">✨ + Add Custom Category...</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
                </div>
              </div>

              {categoryOption === '__CUSTOM__' && !editingBudget && (
                <div className="p-3 bg-surface-container rounded-lg space-y-3">
                  <div>
                    <label className="block font-label-sm text-on-surface-variant mb-1">New Custom Category Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Pets, Gaming, Crypto" 
                      value={customCategoryInput} 
                      onChange={(e) => setCustomCategoryInput(e.target.value)} 
                      required 
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-label-sm text-on-surface-variant mb-1">Monthly Limit (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="e.g. 5000" 
                  value={limit} 
                  onChange={(e) => setLimit(e.target.value)} 
                  required 
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full py-3 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary-container transition-colors shadow-sm">
                  {editingBudget ? 'Update Budget Limit' : 'Save Budget Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
