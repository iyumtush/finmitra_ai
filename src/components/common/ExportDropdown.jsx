import React, { useState, useRef, useEffect } from 'react';
import { exportToCSV, exportToPDF, exportToTXT, exportToJSON } from '../../utils/exportUtils';

export default function ExportDropdown({ transactions = [], user = null, compact = false, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleAction = (exportFn) => {
    setIsOpen(false);
    exportFn(transactions, user);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`flex items-center gap-1.5 font-medium transition-all rounded-lg border border-outline-variant shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 cursor-pointer ${
          compact
            ? 'px-3 py-1.5 text-xs bg-surface-container-low hover:bg-surface-container text-primary'
            : 'px-4 py-2 text-sm bg-surface-container-low hover:bg-surface-container text-primary'
        }`}
        title="Download and export transactions"
      >
        <span className="material-symbols-outlined text-[17px] text-secondary">download</span>
        <span>Download</span>
        <span className={`material-symbols-outlined text-[15px] text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 origin-top-right rounded-xl bg-surface-container-lowest border border-outline-variant shadow-xl z-50 py-1.5 divide-y divide-outline-variant/60 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3.5 py-2">
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Download Statement ({transactions.length})
            </p>
          </div>

          <div className="py-1">
            {/* PDF Statement */}
            <button
              type="button"
              onClick={() => handleAction((t) => exportToPDF(t, user))}
              className="w-full px-3.5 py-2.5 text-left flex items-center gap-3 hover:bg-surface-container-high transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 group-hover:bg-red-500 group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-primary">PDF Statement (.pdf)</div>
                <div className="text-[10px] text-on-surface-variant truncate">Official formatted printable document</div>
              </div>
            </button>

            {/* CSV Spreadsheet */}
            <button
              type="button"
              onClick={() => handleAction((t) => exportToCSV(t))}
              className="w-full px-3.5 py-2.5 text-left flex items-center gap-3 hover:bg-surface-container-high transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[18px]">table_view</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-primary">CSV Spreadsheet (.csv)</div>
                <div className="text-[10px] text-on-surface-variant truncate">Compatible with Excel & Sheets</div>
              </div>
            </button>

            {/* Text Report */}
            <button
              type="button"
              onClick={() => handleAction((t) => exportToTXT(t))}
              className="w-full px-3.5 py-2.5 text-left flex items-center gap-3 hover:bg-surface-container-high transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[18px]">description</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-primary">Summary Ledger (.txt)</div>
                <div className="text-[10px] text-on-surface-variant truncate">Clean text file statement</div>
              </div>
            </button>

            {/* JSON Data */}
            <button
              type="button"
              onClick={() => handleAction((t) => exportToJSON(t))}
              className="w-full px-3.5 py-2.5 text-left flex items-center gap-3 hover:bg-surface-container-high transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[18px]">data_object</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-primary">Raw Data Backup (.json)</div>
                <div className="text-[10px] text-on-surface-variant truncate">JSON structured export</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
