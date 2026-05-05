import React, { useState } from 'react';
import { saveTrainingCV } from '../services/trainingService';
import { useAuth } from '../contexts/AuthContext';

export const CVTrainer: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState('');
  const { user } = useAuth();

  const handleSave = async () => {
    if (!user) return;
    try {
      const data = JSON.parse(jsonInput);
      await saveTrainingCV(data, user.uid);
      setStatus('Successfully saved CV data!');
      setJsonInput('');
    } catch (e) {
      setStatus('Error: ' + e);
    }
  };

  return (
    <div className="p-4 border rounded shadow mt-4">
      <h2 className="text-xl font-bold mb-2">CV Data Trainer</h2>
      <textarea
        className="w-full h-40 p-2 border rounded"
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        placeholder="Paste JSON CV data here"
      />
      <button 
        className="mt-2 bg-indigo-600 text-white p-2 rounded"
        onClick={handleSave}
      >
        Save Training CV
      </button>
      {status && <p className="mt-2">{status}</p>}
    </div>
  );
};
