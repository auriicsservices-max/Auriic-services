import React, { useState } from 'react';
import { Linkedin, Search, Loader2, UserPlus, CheckCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function LinkedInSearch({ onImportComplete }: { onImportComplete: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'keywords' | 'url'>('keywords');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    setIsLoading(true);
    // Simulate API call to backend
    setTimeout(() => {
      setResults([
        { id: '1', fullName: 'John Doe', headline: 'Senior Software Engineer', location: 'London' },
        { id: '2', fullName: 'Jane Smith', headline: 'Product Manager', location: 'New York' }
      ]);
      setIsLoading(false);
    }, 1500);
  };

  const handleImport = async (candidate: any) => {
    // Save to Firestore
    await addDoc(collection(db, 'candidates'), {
      ...candidate,
      source: 'LinkedIn',
      createdAt: new Date().toISOString(),
      isArchived: false,
    });
    onImportComplete();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">LinkedIn Candidate Search</h2>
      </div>

      <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--border-color)]">
        <div className="flex gap-4 mb-4">
          <button 
            onClick={() => setSearchType('keywords')}
            className={`px-4 py-2 rounded-xl ${searchType === 'keywords' ? 'bg-[var(--primary-gold)] text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Keywords
          </button>
          <button 
            onClick={() => setSearchType('url')}
            className={`px-4 py-2 rounded-xl ${searchType === 'url' ? 'bg-[var(--primary-gold)] text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            LinkedIn URL
          </button>
        </div>
        <div className="flex gap-4">
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-3 border border-[var(--border-color)] rounded-xl"
            placeholder={searchType === 'keywords' ? 'e.g. Software Engineer' : 'e.g. linkedin.com/in/username'}
          />
          <button 
            onClick={handleSearch}
            className="px-6 py-3 bg-[var(--primary-blue)] text-white rounded-xl flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
            Search
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
          {results.map(r => (
            <div key={r.id} className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <div>
                <p className="font-bold">{r.fullName}</p>
                <p className="text-sm text-[var(--text-muted)]">{r.headline} • {r.location}</p>
              </div>
              <button 
                onClick={() => handleImport(r)}
                className="px-4 py-2 bg-[var(--primary-gold)] text-white rounded-xl flex items-center gap-2"
              >
                <UserPlus size={16} />
                Import
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
