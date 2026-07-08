import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, where, QueryDocumentSnapshot, DocumentData, getCountFromServer, onSnapshot } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { Pagination } from './Pagination';

interface Props {
  db: any;
  user: any;
  role: string;
}

export const CandidateDataTable: React.FC<Props> = ({ db, user, role }) => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  const fetchCandidates = async (direction: 'next' | 'prev' | 'first' = 'first', newPage: number = page) => {
    
    setLoading(true);
    const isPrivileged = ['admin', 'team_leader', 'developer'].includes(role);
    
    try {
      const q = query(collection(db, 'candidates'));
      const querySnapshot = await getDocs(q);
      let allCandidates = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      // Filter
      allCandidates = allCandidates.filter(c => !c.isArchived);
      if (!isPrivileged) {
        allCandidates = allCandidates.filter(c => c.uploadedBy === user?.uid);
      }
      
      // Sort
      const getTime = (t: any) => t?.toDate ? t.toDate().getTime() : (new Date(t || 0).getTime());
      allCandidates = allCandidates.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
      
      setTotalCount(allCandidates.length);
      
      // Paginate client-side
      const startIndex = (newPage - 1) * rowsPerPage;
      const paginatedCandidates = allCandidates.slice(startIndex, startIndex + rowsPerPage);
      
      setCandidates(paginatedCandidates);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching candidates:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchCandidates('first');
  }, [rowsPerPage]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow">
      {/* Search and Filters here */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Candidates ({totalCount} total)</h2>
          <Pagination 
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={totalCount}
            onPageChange={fetchCandidates}
            onRowsPerPageChange={(rows) => setRowsPerPage(rows)}
            setPage={setPage}
          />
      </div>
      
      {loading ? (
        <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-gold-a98b" /></div>
      ) : (
        <table className="w-full text-left">
            <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="p-4">Name</th>
                    <th className="p-4">Created At</th>
                    <th className="p-4">Domain</th>
                </tr>
            </thead>
            <tbody>
                {candidates.map(c => (
                    <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="p-4 font-medium text-slate-900 dark:text-white">{c.fullName}</td>
                        <td className="p-4">{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : (c.createdAt || 'N/A')}</td>
                        <td className="p-4">{c.domainFocus || 'Other'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      )}
      
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <Pagination 
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={totalCount}
            onPageChange={fetchCandidates}
            onRowsPerPageChange={(rows) => setRowsPerPage(rows)}
            setPage={setPage}
        />
      </div>
    </div>
  );
};
