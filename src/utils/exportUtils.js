/**
 * FinMitra Transaction Export Utilities
 * Provides CSV, PDF, TXT, and JSON data export capabilities.
 */

const getTransactionDescription = (t) => {
  return t.note || t.description || t.title || t.name || t.category || 'Untitled';
};

/**
 * Export transactions to a clean, Excel-compatible CSV file
 */
export const exportToCSV = (transactions, filename = 'FinMitra_Transactions') => {
  if (!transactions || transactions.length === 0) {
    alert('No transactions available to export.');
    return;
  }

  const headers = ['Date', 'Description / Merchant', 'Category', 'Type', 'Amount (INR)'];
  const rows = transactions.map((t) => {
    const isIncome = (t.type || '').toUpperCase() === 'INCOME';
    const dateStr = t.date ? new Date(t.date).toLocaleDateString('en-IN') : 'N/A';
    const desc = getTransactionDescription(t).replace(/"/g, '""');
    const cat = (t.category || 'Other').replace(/"/g, '""');
    const typeStr = isIncome ? 'INCOME' : 'EXPENSE';
    const amtStr = (isIncome ? '+' : '-') + Number(t.amount || 0).toFixed(2);
    return `"${dateStr}","${desc}","${cat}","${typeStr}","${amtStr}"`;
  });

  // UTF-8 BOM ensures Excel and Numbers render ₹ and special characters properly
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}_${getDateSuffix()}.csv`);
};

/**
 * Export transactions to a structured, human-readable plain text report (.txt)
 */
export const exportToTXT = (transactions, filename = 'FinMitra_Statement') => {
  if (!transactions || transactions.length === 0) {
    alert('No transactions available to export.');
    return;
  }

  const totalIncome = transactions
    .filter((t) => (t.type || '').toUpperCase() === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = transactions
    .filter((t) => (t.type || '').toUpperCase() !== 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const netSavings = totalIncome - totalExpense;

  let txt = `========================================================================================\n`;
  txt += `                    FINMITRA - FINANCIAL TRANSACTIONS STATEMENT\n`;
  txt += `                    AI-Financial Adviser & Personal Wealth Platform\n`;
  txt += `========================================================================================\n\n`;
  txt += `Generated On       : ${new Date().toLocaleString('en-IN')}\n`;
  txt += `Total Transactions : ${transactions.length}\n`;
  txt += `Total Income       : ₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
  txt += `Total Expenses     : ₹${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
  txt += `Net Balance        : ${netSavings >= 0 ? '+' : '-'}₹${Math.abs(netSavings).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\n`;
  txt += `----------------------------------------------------------------------------------------\n`;
  txt += `DATE        | TYPE    | AMOUNT (₹)       | CATEGORY        | DESCRIPTION\n`;
  txt += `----------------------------------------------------------------------------------------\n`;

  transactions.forEach((t) => {
    const isInc = (t.type || '').toUpperCase() === 'INCOME';
    const dateStr = (t.date ? new Date(t.date).toLocaleDateString('en-IN') : 'N/A').padEnd(11);
    const typeStr = (isInc ? 'INCOME ' : 'EXPENSE').padEnd(8);
    const amtStr = ((isInc ? '+' : '-') + '₹' + Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })).padEnd(17);
    const catStr = ((t.category || 'Other').slice(0, 15)).padEnd(16);
    const descStr = getTransactionDescription(t);
    txt += `${dateStr} | ${typeStr} | ${amtStr} | ${catStr} | ${descStr}\n`;
  });

  txt += `----------------------------------------------------------------------------------------\n`;
  txt += `End of Statement - Generated securely by FinMitra\n`;
  txt += `========================================================================================\n`;

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
  downloadBlob(blob, `${filename}_${getDateSuffix()}.txt`);
};

/**
 * Export transactions to JSON for data backup and portability
 */
export const exportToJSON = (transactions, filename = 'FinMitra_Backup') => {
  if (!transactions || transactions.length === 0) {
    alert('No transactions available to export.');
    return;
  }

  const exportData = {
    application: 'FinMitra',
    version: '1.0',
    exportTimestamp: new Date().toISOString(),
    transactionCount: transactions.length,
    transactions: transactions
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${filename}_${getDateSuffix()}.json`);
};

/**
 * Export transactions as a professional, printable PDF statement
 * Opens a pre-styled print window triggering the browser's native Save-as-PDF dialog.
 */
export const exportToPDF = (transactions, user = null) => {
  if (!transactions || transactions.length === 0) {
    alert('No transactions available to export.');
    return;
  }

  const totalIncome = transactions
    .filter((t) => (t.type || '').toUpperCase() === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = transactions
    .filter((t) => (t.type || '').toUpperCase() !== 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const netSavings = totalIncome - totalExpense;
  const userIdentifier = user?.email || user?.name || 'Authorized User';

  const rowsHtml = transactions.map((t) => {
    const isIncome = (t.type || '').toUpperCase() === 'INCOME';
    const dateStr = t.date ? new Date(t.date).toLocaleDateString('en-IN') : 'N/A';
    const desc = getTransactionDescription(t);
    const cat = t.category || 'Other';
    const amtClass = isIncome ? 'color-income' : 'color-expense';
    const amtFormatted = (isIncome ? '+' : '-') + '₹' + Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const badgeClass = isIncome ? 'badge-income' : 'badge-expense';

    return `
      <tr>
        <td>${dateStr}</td>
        <td class="bold-text">${escapeHtml(desc)}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(cat)}</span></td>
        <td class="type-cell">${isIncome ? 'Income' : 'Expense'}</td>
        <td class="amount-cell ${amtClass}">${amtFormatted}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>FinMitra Financial Statement - ${getDateSuffix()}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        body {
          color: #111827;
          background: #fff;
          padding: 20px;
          font-size: 12px;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #002b49;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-logo {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          object-contain: cover;
        }
        .brand-title {
          font-size: 24px;
          font-weight: 800;
          color: #002b49;
          letter-spacing: -0.5px;
        }
        .brand-sub {
          font-size: 10px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .meta {
          text-align: right;
          font-size: 11px;
          color: #4b5563;
        }
        .meta strong {
          color: #111827;
        }
        .kpi-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .kpi-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px 14px;
        }
        .kpi-label {
          font-size: 10px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .kpi-value {
          font-size: 16px;
          font-weight: 700;
        }
        .color-income { color: #059669; }
        .color-expense { color: #dc2626; }
        .color-savings { color: #0284c7; }
        .color-primary { color: #002b49; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        thead th {
          background: #002b49;
          color: #ffffff;
          text-align: left;
          padding: 10px 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        thead th:last-child {
          text-align: right;
        }
        tbody td {
          padding: 10px 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 11px;
        }
        tbody tr:nth-child(even) {
          background: #fdfdfd;
        }
        .bold-text {
          font-weight: 600;
          color: #111827;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 9px;
          font-weight: 600;
        }
        .badge-income {
          background: #d1fae5;
          color: #065f46;
        }
        .badge-expense {
          background: #f3f4f6;
          color: #374151;
        }
        .type-cell {
          text-transform: capitalize;
          color: #6b7280;
        }
        .amount-cell {
          text-align: right;
          font-weight: 700;
          font-size: 12px;
        }
        .footer {
          margin-top: 30px;
          border-top: 1px solid #e5e7eb;
          padding-top: 12px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #9ca3af;
        }
        @media print {
          body {
            padding: 0;
          }
          .kpi-card {
            border: 1px solid #ccc;
          }
          thead th {
            background: #002b49 !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .badge {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <img class="brand-logo" src="${window.location.origin}/logo.png" alt="FinMitra Logo" onerror="this.style.display='none'">
          <div>
            <div class="brand-title">FinMitra</div>
            <div class="brand-sub">Institutional-Grade Wealth Management & Ledger</div>
          </div>
        </div>
        <div class="meta">
          <div><strong>Statement Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          <div><strong>Account:</strong> ${escapeHtml(userIdentifier)}</div>
          <div><strong>Records:</strong> ${transactions.length} items</div>
        </div>
      </div>

      <div class="kpi-container">
        <div class="kpi-card">
          <div class="kpi-label">Total Inflow</div>
          <div class="kpi-value color-income">+₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Outflow</div>
          <div class="kpi-value color-expense">-₹${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net Balance</div>
          <div class="kpi-value color-savings">${netSavings >= 0 ? '+' : '-'}₹${Math.abs(netSavings).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Transactions</div>
          <div class="kpi-value color-primary">${transactions.length} Total</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description / Merchant</th>
            <th>Category</th>
            <th>Type</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div>FinMitra AI-Financial Adviser & Personal Wealth Management Platform</div>
        <div>Confidential & Proprietary Statement</div>
      </div>

      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `;

  // Open printable window for instant Save-As-PDF or printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    alert('Pop-up blocked. Please allow pop-ups for this site to generate your PDF statement.');
  }
};

// Helper: Download Blob
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper: Date Suffix YYYY-MM-DD
const getDateSuffix = () => {
  return new Date().toISOString().split('T')[0];
};

// Helper: Escape HTML
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
