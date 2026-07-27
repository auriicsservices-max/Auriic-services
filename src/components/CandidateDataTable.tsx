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
    <div className="crm-table-container">
      {/* Search and Filters header */}
      <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--card-bg)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Candidates ({totalCount} total)</h2>
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
        <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-[var(--primary-gold)]" size={28} /></div>
      ) : (
        <table className="crm-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Created At</th>
                    <th>Domain</th>
                </tr>
            </thead>
            <tbody>
                {candidates.map(c => (
                    <tr key={c.id}>
                        <td className="font-semibold text-[var(--text-primary)]">{c.fullName}</td>
                        <td className="text-[var(--text-primary)]">{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : (c.createdAt || 'N/A')}</td>
                        <td>
                          <span className="crm-badge-gold">
                            {c.domainFocus || 'Other'}
                          </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      )}
      
      <div className="p-4 border-t border-[var(--border-color)] bg-[var(--card-bg)]">
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
