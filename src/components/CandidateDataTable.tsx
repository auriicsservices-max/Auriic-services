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
  const [snapshots, setSnapshots] = useState<QueryDocumentSnapshot<DocumentData>[]>([]); // Store snapshots for pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  const fetchCandidates = async (direction: 'next' | 'prev' | 'first' = 'first') => {
    
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
      
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCandidates(data);
      if (direction === 'first') {
          setSnapshots([querySnapshot.docs[querySnapshot.docs.length - 1]]);
      } else if (direction === 'next') {
          setSnapshots(prev => [...prev, querySnapshot.docs[querySnapshot.docs.length - 1]]);
      } else if (direction === 'prev') {
          setSnapshots(prev => {
              const newSnaps = [...prev];
              newSnaps.pop();
              return [...newSnaps, querySnapshot.docs[querySnapshot.docs.length - 1]];
          });
      }
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
