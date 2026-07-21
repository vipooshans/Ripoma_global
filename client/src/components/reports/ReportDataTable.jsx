import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

const ReportDataTable = ({ columns = [], data = [], defaultSortKey = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState(defaultSortKey || columns[0] || '');
  const [sortOrder, setSortOrder] = useState('desc'); // asc | desc
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // 1. Column formatting helper
  const formatHeader = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // 2. Filter data
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    
    return data.filter(row => {
      return columns.some(col => {
        const val = row[col];
        if (val === undefined || val === null) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm, columns]);

  // 3. Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      // Handle null/undefined
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      if (valA instanceof Date && valB instanceof Date) {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortKey, sortOrder]);

  // 4. Paginate
  const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIdx, startIdx + rowsPerPage);
  }, [sortedData, currentPage]);

  // Cell rendering formatter
  const renderCell = (col, val) => {
    if (val === undefined || val === null) return '-';
    
    const isMoney = /revenue|cogs|expense|profit|amount|total|charge|cost|price/i.test(col);
    if (isMoney && typeof val === 'number') {
      return `LKR ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    if (typeof val === 'number') {
      if (col.toLowerCase().includes('pct') || col.toLowerCase().includes('rate') || col.toLowerCase().includes('growth')) {
        return `${val.toFixed(2)}%`;
      }
      return val.toLocaleString();
    }
    
    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }
    
    return String(val);
  };

  const isNumeric = (col) => {
    const row = data[0];
    if (!row) return false;
    return typeof row[col] === 'number';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden font-sans">
      
      {/* Search Bar header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">
          Report Data Summary ({filteredData.length} records)
        </span>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search report records..."
            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg py-1.5 pl-8 pr-3 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Table grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-slate-800 text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {columns.map(col => (
                <th 
                  key={col} 
                  onClick={() => handleSort(col)}
                  className={`py-3 px-5 cursor-pointer hover:bg-slate-100 transition-colors selection:bg-transparent ${
                    isNumeric(col) ? 'text-right' : ''
                  }`}
                >
                  <div className={`flex items-center gap-1 ${isNumeric(col) ? 'justify-end' : 'justify-start'}`}>
                    <span>{formatHeader(col)}</span>
                    {sortKey === col && (
                      sortOrder === 'asc' ? <ChevronUp size={12} className="text-teal-600" /> : <ChevronDown size={12} className="text-teal-600" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length || 1} className="py-12 text-center text-slate-400 font-medium">
                  No records to display.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                  {columns.map(col => (
                    <td 
                      key={col} 
                      className={`py-3 px-5 font-semibold text-slate-650 ${
                        isNumeric(col) ? 'text-right font-mono font-bold' : ''
                      }`}
                    >
                      {renderCell(col, row[col])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="btn-secondary py-1 px-3 text-[10px] disabled:opacity-50 disabled:pointer-events-none font-bold"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="btn-secondary py-1 px-3 text-[10px] disabled:opacity-50 disabled:pointer-events-none font-bold"
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReportDataTable;
