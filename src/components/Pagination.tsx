import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (direction: 'next' | 'prev' | 'first', newPage: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}

export const Pagination: React.FC<Props> = ({ page, rowsPerPage, totalCount, onPageChange, onRowsPerPageChange, setPage }) => {
  return (
    <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400 py-2">
      <div>
        Showing {Math.min((page - 1) * rowsPerPage + 1, totalCount)}–{Math.min(page * rowsPerPage, totalCount)} of {totalCount} candidates
      </div>
      <div className="flex items-center gap-4">
        <select 
            value={rowsPerPage} 
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))} 
            className="border rounded p-1 dark:bg-slate-800 bg-white"
        >
          {[20, 50, 100, 200].map(v => <option key={v} value={v}>{v} rows</option>)}
        </select>
        <div className="flex gap-1">
          <button 
            className="p-1 border rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50" 
            onClick={() => { const newPage = 1; setPage(newPage); onPageChange('first', newPage); }} 
            disabled={page === 1}
          >
            <span className="text-xs">First</span>
          </button>
          <button 
            className="p-1 border rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50" 
            onClick={() => { const newPage = Math.max(1, page - 1); setPage(newPage); onPageChange('prev', newPage); }} 
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            className="p-1 border rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50" 
            onClick={() => { const newPage = page + 1; setPage(newPage); onPageChange('next', newPage); }} 
            disabled={page * rowsPerPage >= totalCount}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
