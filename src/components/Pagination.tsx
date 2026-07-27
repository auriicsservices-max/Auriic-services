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
    <div className="flex flex-wrap justify-between items-center text-sm font-medium text-[var(--text-primary)] py-2 gap-3">
      <div className="text-xs font-semibold text-[var(--text-secondary)]">
        Showing <span className="text-[var(--text-primary)] font-bold">{Math.min((page - 1) * rowsPerPage + 1, totalCount)}</span>–<span className="text-[var(--text-primary)] font-bold">{Math.min(page * rowsPerPage, totalCount)}</span> of <span className="text-[var(--text-primary)] font-bold">{totalCount}</span> candidates
      </div>
      <div className="flex items-center gap-3">
        <select 
            value={rowsPerPage} 
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))} 
            className="crm-input py-1 px-2 text-xs font-semibold w-auto cursor-pointer"
        >
          {[20, 50, 100, 200].map(v => <option key={v} value={v}>{v} rows</option>)}
        </select>
        <div className="flex gap-1">
          <button 
            className="crm-btn-secondary py-1 px-2.5 text-xs font-bold disabled:opacity-40" 
            onClick={() => { const newPage = 1; setPage(newPage); onPageChange('first', newPage); }} 
            disabled={page === 1}
          >
            First
          </button>
          <button 
            className="crm-btn-secondary p-1.5 disabled:opacity-40" 
            onClick={() => { const newPage = Math.max(1, page - 1); setPage(newPage); onPageChange('prev', newPage); }} 
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            className="crm-btn-secondary p-1.5 disabled:opacity-40" 
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
