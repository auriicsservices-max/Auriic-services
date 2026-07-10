import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, User, Mail, Phone, Briefcase, MapPin, Linkedin, Github, ExternalLink } from 'lucide-react';

export default function CandidateDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const fetchCandidate = async () => {
      const docRef = doc(db, 'candidates', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCandidate({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    };

    fetchCandidate();

    const q = query(
      collection(db, 'activity_logs'),
      where('candidateId', '==', id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [id]);

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!candidate) return <div className="p-10 text-center">Candidate not found</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto bg-[var(--bg-primary)] min-h-screen">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--brand-color)]">
        <ArrowLeft size={18} /> Back to Pipeline
      </button>

      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6 shadow-[var(--card-shadow)] mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{candidate.fullName}</h1>
        <p className="text-lg text-[var(--text-secondary)] mb-4">{candidate.position}</p>
        
        <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
          {candidate.contact?.email && <div className="flex items-center gap-1.5"><Mail size={16}/> {candidate.contact.email}</div>}
          {candidate.contact?.phone && <div className="flex items-center gap-1.5"><Phone size={16}/> {candidate.contact.phone}</div>}
          {candidate.location && <div className="flex items-center gap-1.5"><MapPin size={16}/> {candidate.location}</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6 shadow-[var(--card-shadow)]">
          <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Experience</h2>
          {/* Add experience details here */}
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6 shadow-[var(--card-shadow)]">
          <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Activity Log</h2>
          <div className="space-y-4">
            {activities.map(act => (
              <div key={act.id} className="border-l-2 border-[var(--border-color)] pl-4 pb-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">{act.action}</p>
                <p className="text-xs text-[var(--text-muted)]">{act.createdAt?.toDate?.().toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
