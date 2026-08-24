import React, { useState, useEffect, useRef } from 'react';
import { transactionApi } from '../api/transactionApi';
import { categoryApi } from '../api/categoryApi';
import { aiApi } from '../api/aiApi';

const BUILT_IN_CATEGORIES = [
  'Food, Beverages & Groceries',
  'Travel & Transport',
  'Online Shopping',
  'Rent',
  'Utilities',
  'Entertainment',
  'Health',
  'To People',
  'Salary'
];

export default function TransactionsView({ onNavigateTab }) {
  const [txList, setTxList] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategoryOption, setSelectedCategoryOption] = useState('Food, Beverages & Groceries');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [customCategoryColor, setCustomCategoryColor] = useState('#00E676');
  const [note, setNote] = useState('');
  const [type, setType] = useState('Expense');
  const [amount, setAmount] = useState('');

  // Receipt Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txData, catData] = await Promise.all([
        transactionApi.getTransactions(),
        categoryApi.getCategories().catch(() => [])
      ]);
      setTxList(txData);
      setCustomCategories(catData || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingTx(null);
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedCategoryOption('Food, Beverages & Groceries');
    setCustomCategoryInput('');
    setCustomCategoryColor('#00E676');
    setNote('');
    setType('Expense');
    setAmount('');
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (tx) => {
    setEditingTx(tx);
    setDate(tx.date ? tx.date.split('T')[0] : '');
    setSelectedCategoryOption(tx.category);
    setCustomCategoryInput('');
    setNote(tx.note);
    setType(tx.type === 'INCOME' || tx.type === 'Income' ? 'Income' : 'Expense');
    setAmount(tx.amount.toString());
    setErrorMsg('');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await transactionApi.deleteTransaction(id);
      const updated = txList.filter(t => t.id !== id);
      setTxList(updated);
    } catch (err) {
      alert('Failed to delete transaction');
    }
  };

  const handleSubmit = async (e, customPayload = null) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    let finalCategory = selectedCategoryOption;

    try {
      if (selectedCategoryOption === '__CUSTOM__' && !customPayload) {
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

      const payload = customPayload || {
        amount: parseFloat(amount),
        category: finalCategory,
        note,
        type: type.toUpperCase(),
        date
      };

      if (editingTx && !customPayload) {
        const updatedTx = await transactionApi.updateTransaction(editingTx.id, payload);
        const updatedList = txList.map(t => t.id === editingTx.id ? updatedTx : t);
        setTxList(updatedList);
      } else {
        const newTx = await transactionApi.createTransaction(payload);
        const updatedList = [newTx, ...txList];
        setTxList(updatedList);
      }

      setShowModal(false);
      setEditingTx(null);
      if (customPayload) setScannedData(null);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save transaction');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setScannedData(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result.split(',')[1];
        const res = await aiApi.parseReceiptImage(base64String, file.type);
        if (res) {
          setScannedData({
            merchant: res.merchant || 'Unknown Merchant',
            date: res.date || new Date().toISOString().split('T')[0],
            amount: res.amount || 0,
            category: res.category || 'Food & Dining',
          });
        }
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsScanning(false);
      alert('Failed to scan receipt');
    }
  };

  const saveScannedTransaction = () => {
    if (!scannedData) return;
    handleSubmit(null, {
      amount: parseFloat(scannedData.amount),
      category: scannedData.category,
      note: scannedData.merchant,
      type: 'EXPENSE',
      date: scannedData.date
    });
  };

  const customNames = customCategories.map(c => c.name);
  const allCategoryOptions = Array.from(new Set([...BUILT_IN_CATEGORIES, ...customNames]));

  const getCategoryIcon = (cat) => {
    cat = (cat || '').toLowerCase();
    if (cat.includes('food') || cat.includes('dining')) return 'restaurant';
    if (cat.includes('travel') || cat.includes('transport')) return 'flight';
    if (cat.includes('software') || cat.includes('tech')) return 'computer';
    if (cat.includes('shop')) return 'shopping_bag';
    if (cat.includes('income') || cat.includes('salary')) return 'payments';
    return 'receipt';
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-surface w-full h-full">
      <div className="max-w-[1440px] mx-auto h-full flex flex-col gap-6">
        
        {/* Page Header & Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="font-headline-lg text-headline-lg text-primary">Transactions</h2>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button 
              onClick={openAddModal}
              className="px-4 py-2 bg-primary text-on-primary rounded-DEFAULT font-label-md text-label-md hover:bg-primary-container transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Transaction
            </button>
            <button className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-DEFAULT font-label-md text-label-md hover:bg-surface-container-lowest transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Filters
            </button>
          </div>
        </div>

        {/* Content Layout: Bento Style */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[500px]">
          
          {/* Left: Data Table (Spans 8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4 h-full">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex-1 flex flex-col overflow-hidden h-full">
              <div className="px-6 py-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md text-primary">Recent Activity</h3>
                <button className="text-secondary font-label-sm text-label-sm hover:underline">Export CSV</button>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-surface-container-low sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-6 font-label-sm text-label-sm text-on-surface-variant font-semibold border-b border-outline-variant">Date</th>
                      <th className="py-3 px-6 font-label-sm text-label-sm text-on-surface-variant font-semibold border-b border-outline-variant">Description</th>
                      <th className="py-3 px-6 font-label-sm text-label-sm text-on-surface-variant font-semibold border-b border-outline-variant">Category</th>
                      <th className="py-3 px-6 font-label-sm text-label-sm text-on-surface-variant font-semibold border-b border-outline-variant text-right">Amount</th>
                      <th className="py-3 px-6 font-label-sm text-label-sm text-on-surface-variant font-semibold border-b border-outline-variant text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant font-body-md text-body-md text-on-surface">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-on-surface-variant">Loading transactions...</td>
                      </tr>
                    ) : txList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-on-surface-variant">No transactions found. Add one or scan a receipt!</td>
                      </tr>
                    ) : txList.map(tx => {
                      const isIncome = (tx.type || '').toUpperCase() === 'INCOME';
                      return (
                        <tr key={tx.id} className="hover:bg-surface-bright transition-colors">
                          <td className="py-4 px-6 text-on-surface-variant whitespace-nowrap">
                            {tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-4 px-6 font-medium text-primary flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center text-outline shrink-0">
                              <span className="material-symbols-outlined text-[16px]">{getCategoryIcon(tx.category)}</span>
                            </div>
                            <span className="truncate max-w-[200px] block">{tx.note || tx.title || 'Untitled'}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-1 rounded text-label-sm whitespace-nowrap ${isIncome ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-high'}`}>
                              {tx.category || 'Other'}
                            </span>
                          </td>
                          <td className={`py-4 px-6 text-right font-medium whitespace-nowrap ${isIncome ? 'text-secondary' : ''}`}>
                            {isIncome ? '+' : '-'}₹{Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => openEditModal(tx)} className="text-secondary hover:text-primary transition-colors">
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button onClick={() => handleDelete(tx.id)} className="text-error hover:text-on-error-container transition-colors">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: AI Receipt Scanner (Spans 4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4 h-full">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex-1 flex flex-col p-6 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-on-secondary">
                  <span className="material-symbols-outlined text-[18px]">document_scanner</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-primary">AI Receipt Scanner</h3>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Powered by Gemini AI</p>
                </div>
              </div>

              {!isScanning && !scannedData ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-secondary rounded-lg p-6 flex flex-col items-center justify-center text-center mb-6 h-40 cursor-pointer hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-[32px] text-secondary mb-2">upload_file</span>
                  <p className="font-body-md text-body-md text-on-surface font-medium">Click to Upload Receipt</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Extract data automatically via AI</p>
                </div>
              ) : isScanning ? (
                <div className="border-2 border-dashed border-secondary rounded-lg p-6 flex flex-col items-center justify-center text-center mb-6 h-40 bg-surface-container-low relative overflow-hidden">
                  <span className="material-symbols-outlined text-[32px] text-secondary mb-2 animate-bounce">receipt</span>
                  <p className="font-body-md text-body-md text-on-surface font-medium">Processing Receipt...</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Extracting data via Gemini</p>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-surface-container-high">
                    <div className="h-full bg-secondary w-3/4 rounded-r animate-pulse"></div>
                  </div>
                </div>
              ) : null}

              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload} 
              />

              {scannedData && (
                <div className="flex-1 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 ml-1">Merchant</label>
                    <div className="relative">
                      <input 
                        className="w-full pl-3 pr-10 py-2 bg-surface-container-low border border-outline-variant rounded-DEFAULT font-body-md text-body-md text-on-surface focus:outline-none focus:border-secondary" 
                        type="text" 
                        value={scannedData.merchant}
                        onChange={(e) => setScannedData({...scannedData, merchant: e.target.value})}
                      />
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-[16px]">check_circle</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 ml-1">Date</label>
                      <div className="relative">
                        <input 
                          className="w-full pl-3 pr-8 py-2 bg-surface-container-low border border-outline-variant rounded-DEFAULT font-body-md text-body-md text-on-surface focus:outline-none focus:border-secondary" 
                          type="date" 
                          value={scannedData.date}
                          onChange={(e) => setScannedData({...scannedData, date: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 ml-1">Amount</label>
                      <div className="relative">
                        <input 
                          className="w-full pl-3 pr-8 py-2 bg-surface-container-low border border-outline-variant rounded-DEFAULT font-body-md text-body-md text-on-surface focus:outline-none focus:border-secondary" 
                          type="number" 
                          step="0.01"
                          value={scannedData.amount}
                          onChange={(e) => setScannedData({...scannedData, amount: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 ml-1">Suggested Category</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none pl-3 pr-10 py-2 bg-surface-container-lowest border border-secondary rounded-DEFAULT font-body-md text-body-md text-on-surface focus:outline-none ring-1 ring-secondary"
                        value={scannedData.category}
                        onChange={(e) => setScannedData({...scannedData, category: e.target.value})}
                      >
                        {allCategoryOptions.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-secondary text-[16px]">auto_awesome</span>
                      <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1 ml-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] text-secondary">info</span> 
                      AI high confidence match
                    </p>
                  </div>
                  
                  {/* CTA */}
                  <div className="mt-auto pt-4 border-t border-outline-variant flex gap-3">
                    <button 
                      onClick={() => setScannedData(null)}
                      className="flex-1 py-2 border border-outline-variant text-on-surface-variant rounded-DEFAULT font-label-md text-label-md hover:bg-surface-container-low transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={saveScannedTransaction}
                      className="flex-[2] py-2 bg-primary text-on-primary rounded-DEFAULT font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm"
                    >
                      Review & Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b border-outline-variant">
              <h3 className="font-headline-md text-headline-md text-primary">
                {editingTx ? 'Edit Transaction' : 'Add New Transaction'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">
                  {errorMsg}
                </div>
              )}
              
              <div className="flex p-1 bg-surface-container-low rounded-lg">
                <button 
                  type="button" 
                  onClick={() => setType('Expense')}
                  className={`flex-1 py-2 text-center rounded-md font-label-md transition-all ${type === 'Expense' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Expense
                </button>
                <button 
                  type="button" 
                  onClick={() => setType('Income')}
                  className={`flex-1 py-2 text-center rounded-md font-label-md transition-all ${type === 'Income' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Income
                </button>
              </div>

              <div>
                <label className="block font-label-sm text-on-surface-variant mb-1">Date</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  required 
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block font-label-sm text-on-surface-variant mb-1">Category</label>
                <div className="relative">
                  <select 
                    value={selectedCategoryOption} 
                    onChange={(e) => setSelectedCategoryOption(e.target.value)}
                    className="w-full appearance-none px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary pr-10"
                  >
                    {allCategoryOptions.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                    <option value="__CUSTOM__">✨ + Add Custom Category...</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
                </div>
              </div>

              {selectedCategoryOption === '__CUSTOM__' && (
                <div className="p-3 bg-surface-container rounded-lg space-y-3">
                  <div>
                    <label className="block font-label-sm text-on-surface-variant mb-1">New Category Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Pets" 
                      value={customCategoryInput} 
                      onChange={(e) => setCustomCategoryInput(e.target.value)} 
                      required 
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-label-sm text-on-surface-variant mb-1">Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Grocery store" 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                  required 
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block font-label-sm text-on-surface-variant mb-1">Amount (₹)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="e.g. 1500" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  required 
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full py-3 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary-container transition-colors shadow-sm">
                  {editingTx ? 'Update Transaction' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
