import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, where, QueryDocumentSnapshot, DocumentData, getCountFromServer, onSnapshot } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';

interface Props {
  db: any;
  user: any;
  role: string;
}

export const CandidateDataTable: React.FC<Props> = ({ db, user, role }) => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [snapshots, setSnapshots] = useState<QueryDocumentSnapshot<DocumentData>[]>([]); // Store snapshots for pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const unsubRef = React.useRef<() => void>();
  
  const fetchCandidates = async (direction: 'next' | 'prev' | 'first' = 'first') => {
    if (unsubRef.current) unsubRef.current();
    
    setLoading(true);
    const isPrivileged = ['admin', 'team_leader', 'developer'].includes(role);
    const filterQuery = isPrivileged ? [] : [where('uploadedBy', '==', user?.uid)];

    try {
      // Fetch total count for all users
      const countQuery = query(collection(db, 'candidates'), where('isArchived', '==', false), ...filterQuery);
      const countSnapshot = await getCountFromServer(countQuery);
      setTotalCount(countSnapshot.data().count);

      let q = query(
        collection(db, 'candidates'), 
        where('isArchived', '==', false),
        ...filterQuery,
        orderBy('createdAt', 'desc'),
        limit(rowsPerPage)
      );

      if (direction === 'next' && snapshots.length > 0) {
        q = query(q, startAfter(snapshots[snapshots.length - 1]));
      } else if (direction === 'prev' && snapshots.length > 1) {
        // To go back, we need to fetch the page BEFORE the previous one, and then limit to rowsPerPage.
        // This is complex. For now, let's pop the last snapshot and fetch again from the one before that.
        const newSnapshots = [...snapshots];
        newSnapshots.pop(); // Remove current page's snapshot
        newSnapshots.pop(); // Remove previous page's snapshot (we want to start *before* this one)
        
        if (newSnapshots.length > 0) {
          q = query(q, startAfter(newSnapshots[newSnapshots.length - 1]));
        }
        setSnapshots(newSnapshots);
      }
      
      unsubRef.current = onSnapshot(q, async (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCandidates(data);
        if (direction === 'first') {
            setSnapshots([snapshot.docs[snapshot.docs.length - 1]]);
        } else if (direction === 'next') {
            setSnapshots(prev => [...prev, snapshot.docs[snapshot.docs.length - 1]]);
        } else if (direction === 'prev') {
            setSnapshots(prev => {
                const newSnaps = [...prev];
                newSnaps.pop();
                return [...newSnaps, snapshot.docs[snapshot.docs.length - 1]];
            });
        }
        setLoading(false);
      });
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
        <div>
          Showing {Math.min((page - 1) * rowsPerPage + 1, totalCount)}–{Math.min(page * rowsPerPage, totalCount)} of {totalCount} candidates
        </div>
        <div className="flex items-center gap-4">
            <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))} className="border rounded p-1 dark:bg-slate-800">
                {[20, 50, 100, 200].map(v => <option key={v} value={v}>{v} rows</option>)}
            </select>
            <div className="flex gap-2">
                <button className="p-2 border rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50" onClick={() => { setPage(1); fetchCandidates('first'); }} disabled={page === 1}>First</button>
                <button className="p-2 border rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50" onClick={() => { setPage(p => Math.max(1, p - 1)); fetchCandidates('prev'); }} disabled={page === 1}>Previous</button>
                <button className="p-2 border rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50" onClick={() => { setPage(p => p + 1); fetchCandidates('next'); }} disabled={page * rowsPerPage >= totalCount}>Next</button>
            </div>
        </div>
      </div>
    </div>
  );
};
