import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, where, QueryDocumentSnapshot, DocumentData, getCountFromServer } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';

interface Props {
  db: any;
  user: any;
  role: string;
}

export const CandidateDataTable: React.FC<Props> = ({ db, user, role }) => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const unsubRef = React.useRef<() => void>();
  
  const fetchCandidates = async (isNext: boolean = false) => {
    if (unsubRef.current) unsubRef.current();
    
    setLoading(true);
    try {
      // Fetch total count for all users
      const countQuery = query(collection(db, 'candidates'), where('isArchived', '==', false));
      const countSnapshot = await getCountFromServer(countQuery);
      setTotalCount(countSnapshot.data().count);

      const q = query(
        collection(db, 'candidates'), 
        where('isArchived', '==', false),
        orderBy('createdAt', 'desc'),
        limit(rowsPerPage),
        ...(isNext && lastVisible ? [startAfter(lastVisible)] : [])
      );
      
      unsubRef.current = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCandidates(data);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setLoading(false);
      });
    } catch (err) {
      console.error("Error fetching candidates:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    return () => {
        if (unsubRef.current) unsubRef.current();
    };
  }, [rowsPerPage]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow">
      {/* Search and Filters here */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Candidates ({totalCount} total)</h2>
      </div>
      
      {loading ? (
        <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div>
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
                        <td className="p-4">{c.createdAt}</td>
                        <td className="p-4">{c.domainFocus || 'Other'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      )}
      
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
        <span>Showing {candidates.length} of {totalCount} candidates (Page {page})</span>
        <div className="flex gap-2">
            <button className="p-2 border rounded hover:bg-slate-100 disabled:opacity-50" onClick={() => { setPage(p => Math.max(1, p - 1)); fetchCandidates(); }} disabled={page === 1}>Previous</button>
            <button className="p-2 border rounded hover:bg-slate-100" onClick={() => { setPage(p => p + 1); fetchCandidates(true); }}>Next</button>
        </div>
      </div>
    </div>
  );
};
