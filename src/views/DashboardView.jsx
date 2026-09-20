import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { transactionApi } from '../api/transactionApi';
import { useAuth } from '../context/AuthContext';
import ExportDropdown from '../components/common/ExportDropdown';

const getCurrentMonthName = () => {
  return new Date().toLocaleDateString('en-US', { month: 'long' });
};

const MONTH_INDEX_MAP = {
  'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
  'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
};

export default function DashboardView({ onNavigateTab }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthName());
  const [viewMode, setViewMode] = useState('weeks'); 
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [newIncome, setNewIncome] = useState('');
  const [isUpdatingIncome, setIsUpdatingIncome] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const txData = await transactionApi.getTransactions();
      setTransactions(txData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateSalary = async (e) => {
    e.preventDefault();
    if (!newIncome || parseFloat(newIncome) < 0) return;
    
    setIsUpdatingIncome(true);
    try {
      const salaryTx = transactions.find(t => (t.category || '').toLowerCase() === 'salary' || (t.type || '').toUpperCase() === 'INCOME');
      
      if (salaryTx) {
        await transactionApi.updateTransaction(salaryTx.id, {
          ...salaryTx,
          amount: parseFloat(newIncome)
        });
      } else {
        await transactionApi.createTransaction({
          amount: parseFloat(newIncome),
          category: 'Salary',
          note: 'Monthly Salary',
          type: 'INCOME',
          date: new Date().toISOString().split('T')[0]
        });
      }
      
      await fetchData();
      setShowIncomeModal(false);
      setNewIncome('');
    } catch (err) {
      console.error('Failed to update salary:', err);
      alert('Failed to update salary.');
    } finally {
      setIsUpdatingIncome(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (selectedMonth === 'All Months') return true;
    if (!t.date) return true;
    const d = new Date(t.date);
    if (isNaN(d.getTime())) return true;
    const targetMonthIndex = MONTH_INDEX_MAP[selectedMonth];
    if (targetMonthIndex !== undefined) {
      return d.getMonth() === targetMonthIndex;
    }
    return true;
  });

  let totalIncome = 0;
  let totalExpense = 0;

  filteredTransactions.forEach(t => {
    const amt = Number(t.amount || 0);
    const typeUpper = t.type ? t.type.toUpperCase() : 'EXPENSE';
    if (typeUpper === 'INCOME') {
      totalIncome += amt;
    } else {
      totalExpense += amt;
    }
  });

  const savings = totalIncome - totalExpense;
  const totalBalance = savings; 

  const expenseTx = filteredTransactions.filter(t => (t.type || '').toUpperCase() === 'EXPENSE');
  
  let realTrendData = [];
  const weeksMap = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0, 'Week 5': 0 };
  
  expenseTx.forEach(t => {
    if (!t.date) return;
    const d = new Date(t.date);
    if (isNaN(d.getTime())) return;
    const dayOfMonth = d.getDate();
    if (dayOfMonth >= 1 && dayOfMonth <= 7) weeksMap['Week 1'] += Number(t.amount || 0);
    else if (dayOfMonth >= 8 && dayOfMonth <= 14) weeksMap['Week 2'] += Number(t.amount || 0);
    else if (dayOfMonth >= 15 && dayOfMonth <= 21) weeksMap['Week 3'] += Number(t.amount || 0);
    else if (dayOfMonth >= 22 && dayOfMonth <= 28) weeksMap['Week 4'] += Number(t.amount || 0);
    else if (dayOfMonth >= 29) weeksMap['Week 5'] += Number(t.amount || 0);
  });

  realTrendData = [
    { name: 'Week 1', Spend: weeksMap['Week 1'] },
    { name: 'Week 2', Spend: weeksMap['Week 2'] },
    { name: 'Week 3', Spend: weeksMap['Week 3'] },
    { name: 'Week 4', Spend: weeksMap['Week 4'] },
  ];
  if (weeksMap['Week 5'] > 0) {
    realTrendData.push({ name: 'Week 5', Spend: weeksMap['Week 5'] });
  }

  // Daily Aggregation
  let dailyTrendData = [];
  const dailyMap = {};
  
  expenseTx.forEach(t => {
    if (!t.date) return;
    const d = new Date(t.date);
    if (isNaN(d.getTime())) return;
    const dateStr = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    if (!dailyMap[dateStr]) dailyMap[dateStr] = 0;
    dailyMap[dateStr] += Number(t.amount || 0);
  });
  
  // Sort daily data by actual date chronologically
  dailyTrendData = Object.keys(dailyMap)
    .sort((a, b) => new Date(a + ` ${new Date().getFullYear()}`) - new Date(b + ` ${new Date().getFullYear()}`))
    .map(key => ({
      name: key,
      Spend: dailyMap[key]
    }));

  // Monthly Aggregation
  let monthlyTrendData = [];
  const monthMap = {};
  
  expenseTx.forEach(t => {
    if (!t.date) return;
    const d = new Date(t.date);
    if (isNaN(d.getTime())) return;
    const monthStr = d.toLocaleDateString('default', { month: 'short' }); 
    if (!monthMap[monthStr]) monthMap[monthStr] = 0;
    monthMap[monthStr] += Number(t.amount || 0);
  });
  
  monthlyTrendData = Object.keys(monthMap)
    .sort((a, b) => new Date(`${a} 1, 2020`) - new Date(`${b} 1, 2020`))
    .map(key => ({
      name: key,
      Spend: monthMap[key]
    }));

  const chartData = viewMode === 'months' ? monthlyTrendData : (viewMode === 'weeks' ? realTrendData : dailyTrendData);

  // Get recent 5 transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 5);

  const getCategoryIcon = (cat) => {
    cat = (cat || '').toLowerCase();
    if (cat.includes('food') || cat.includes('dining')) return 'restaurant';
    if (cat.includes('travel') || cat.includes('transport')) return 'flight';
    if (cat.includes('software') || cat.includes('tech')) return 'computer';
    if (cat.includes('shop')) return 'shopping_bag';
    if (cat.includes('income') || cat.includes('salary')) return 'work';
    return 'receipt';
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-surface w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
            Welcome back, {(user?.user_metadata?.name || user?.user_metadata?.full_name || user?.name || 'User').split(' ')[0]}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">Here is your financial overview for today.</p>
        </div>
        
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm min-w-[280px]">
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Total Balance</p>
          <h3 className="font-display-lg text-display-lg text-primary">₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <div className="flex items-center gap-1 mt-2 text-secondary">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span className="font-label-md text-label-md">+0.0% this month</span>
          </div>
        </div>
      </div>
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between h-40 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Income</p>
              <button 
                onClick={() => {
                  setNewIncome(totalIncome.toString());
                  setShowIncomeModal(true);
                }} 
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                title="Edit Salary"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>
            </div>
            <p className="font-headline-md text-headline-md text-primary mt-1">₹{totalIncome.toLocaleString('en-IN')}</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30">
            <svg className="w-full h-full text-secondary stroke-current fill-none" preserveAspectRatio="none" strokeWidth="2" viewBox="0 0 100 40">
              <path d="M0 40 L 10 30 L 20 35 L 30 20 L 40 25 L 50 10 L 60 15 L 70 5 L 80 15 L 90 0 L 100 10"></path>
            </svg>
          </div>
        </div>
        
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between h-40 relative overflow-hidden">
          <div className="relative z-10">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Expenses</p>
            <p className="font-headline-md text-headline-md text-primary mt-1">₹{totalExpense.toLocaleString('en-IN')}</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30">
            <svg className="w-full h-full text-error stroke-current fill-none" preserveAspectRatio="none" strokeWidth="2" viewBox="0 0 100 40">
              <path d="M0 10 L 10 15 L 20 5 L 30 20 L 40 15 L 50 25 L 60 20 L 70 35 L 80 25 L 90 40 L 100 30"></path>
            </svg>
          </div>
        </div>
        
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between h-40 relative overflow-hidden">
          <div className="relative z-10">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Net Savings</p>
            <p className="font-headline-md text-headline-md text-primary mt-1">₹{savings.toLocaleString('en-IN')}</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30">
            <svg className="w-full h-full text-secondary stroke-current fill-none" preserveAspectRatio="none" strokeWidth="2" viewBox="0 0 100 40">
              <path d="M0 30 L 20 25 L 40 15 L 60 10 L 80 5 L 100 0"></path>
            </svg>
          </div>
        </div>
      </div>
      
      {/* Middle Row: Chart & Quick Actions (Bento Grid Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Large Chart Area */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-primary">Spends Overview</h3>
            <div className="flex gap-4 items-center">
              <div className="flex bg-surface-container-low p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('months')}
                  className={`px-3 py-1 font-label-md text-label-md rounded-md transition-all ${viewMode === 'months' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setViewMode('weeks')}
                  className={`px-3 py-1 font-label-md text-label-md rounded-md transition-all ${viewMode === 'weeks' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setViewMode('days')}
                  className={`px-3 py-1 font-label-md text-label-md rounded-md transition-all ${viewMode === 'days' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Daily
                </button>
              </div>
              <select 
                className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1 font-label-md text-label-md text-on-surface-variant focus:ring-secondary focus:border-secondary outline-none h-8"
                value={selectedMonth}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedMonth(val);
                  if (val === 'All Months') setViewMode('months');
                  else if (viewMode === 'months') setViewMode('weeks');
                }}
              >
                <option value="All Months">All Months</option>
                <option value={getCurrentMonthName()}>{getCurrentMonthName()}</option>
              </select>
            </div>
          </div>
          
          <div className="flex-1 w-full relative min-h-[250px]">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant">Loading...</div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} tick={{ fill: 'currentColor', fontSize: 12 }} width={60} />
                  <Tooltip 
                    cursor={{fill: 'var(--surface-container-high)'}} 
                    contentStyle={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)', borderRadius: 8, color: 'var(--on-surface)' }}
                    itemStyle={{ color: 'var(--on-surface)' }}
                    formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} 
                  />
                  <Bar dataKey="Spend" fill="#00677e" radius={[4, 4, 0, 0]} barSize={viewMode === 'weeks' ? 40 : 20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant text-sm flex-col gap-2">
                <span className="material-symbols-outlined text-3xl">bar_chart</span>
                No expense transactions logged.
              </div>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary"></div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Expenses</span>
            </div>
          </div>
        </div>
        
        {/* Quick Actions & AI Insight */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex-1">
            <h3 className="font-headline-md text-headline-md text-primary mb-6">Quick Actions</h3>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => onNavigateTab ? onNavigateTab('transactions') : null}
                className="w-full bg-primary text-on-primary py-3 rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-primary-container transition-colors"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                Add Transaction
              </button>
              <button 
                onClick={() => onNavigateTab ? onNavigateTab('transactions') : null}
                className="w-full border-2 border-secondary text-secondary py-3 rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                Upload Receipt
              </button>
              <button 
                onClick={() => onNavigateTab ? onNavigateTab('budget') : null}
                className="w-full bg-surface-container-low text-primary py-3 rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors mt-2"
              >
                <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                Manage Budget
              </button>
            </div>
          </div>
          
          <div className="bg-secondary-container/10 border border-secondary-container p-6 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <span className="material-symbols-outlined text-4xl text-secondary">psychology</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-secondary text-sm">lightbulb</span>
              <span className="font-label-sm text-label-sm text-secondary uppercase font-bold">AI Insight</span>
            </div>
            <p className="font-body-md text-body-md text-primary">
              Your discretionary spending is looking great. Have you tried asking the AI Advisor for personalized savings goals?
            </p>
          </div>
        </div>
      </div>
      
      {/* Bottom Row: Recent Transactions Table */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm mb-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-headline-md text-headline-md text-primary">Recent Transactions</h3>
          <div className="flex items-center gap-3">
            <ExportDropdown transactions={transactions} user={user} compact={true} />
            <button 
              onClick={() => onNavigateTab ? onNavigateTab('transactions') : null}
              className="text-secondary font-label-md text-label-md hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase">
                <th className="pb-3 font-semibold w-1/3">Description</th>
                <th className="pb-3 font-semibold px-4">Date</th>
                <th className="pb-3 font-semibold px-4">Category</th>
                <th className="pb-3 font-semibold px-4">Type</th>
                <th className="pb-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md">
              {recentTransactions.length > 0 ? recentTransactions.map(tx => {
                const isIncome = (tx.type || '').toUpperCase() === 'INCOME';
                return (
                  <tr key={tx.id} className="border-b border-surface-variant hover:bg-surface-container-low transition-colors group">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary group-hover:bg-white shrink-0">
                          <span className="material-symbols-outlined">{getCategoryIcon(tx.category)}</span>
                        </div>
                        <span className="font-medium text-primary break-all line-clamp-1">
                          {tx.note || tx.description || tx.title || tx.name || tx.category || 'Untitled'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-on-surface-variant whitespace-nowrap">
                      {tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-on-surface-variant">{tx.category || 'Other'}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isIncome ? 'bg-secondary/10 text-secondary' : 'bg-outline-variant/30 text-on-surface-variant'}`}>
                        {isIncome ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className={`py-4 text-right font-medium whitespace-nowrap ${isIncome ? 'text-secondary' : 'text-on-background'}`}>
                      {isIncome ? '+' : '-'}₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-on-surface-variant">No transactions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Salary Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b border-outline-variant">
              <h3 className="font-headline-md text-headline-md text-primary">Update Salary</h3>
              <button onClick={() => setShowIncomeModal(false)} className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleUpdateSalary} className="p-6 space-y-4">
              <div>
                <label className="block font-label-sm text-on-surface-variant mb-1">Monthly Salary (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 60000"
                  value={newIncome}
                  onChange={(e) => setNewIncome(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary"
                  autoFocus
                />
              </div>
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isUpdatingIncome}
                  className="w-full py-3 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary-container transition-colors shadow-sm disabled:opacity-70"
                >
                  {isUpdatingIncome ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
