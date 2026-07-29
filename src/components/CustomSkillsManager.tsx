import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Sparkles, Plus, Edit2, Trash2, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

const DEFAULT_CUSTOM_SKILLS = [
  { id: '1', name: 'React', category: 'Technical', description: 'Frontend UI library & React ecosystem' },
  { id: '2', name: 'Node.js', category: 'Technical', description: 'JavaScript backend runtime' },
  { id: '3', name: 'Python', category: 'Technical', description: 'Data science, AI & backend programming' },
  { id: '4', name: 'AWS', category: 'Technical', description: 'Cloud infrastructure & DevOps' },
  { id: '5', name: 'PostgreSQL', category: 'Technical', description: 'Relational database architecture' },
  { id: '6', name: 'Agile Project Management', category: 'Functional', description: 'Sprint planning & backlog grooming' },
  { id: '7', name: 'Scrum Master', category: 'Functional', description: 'Scrum facilitation & team guidance' },
  { id: '8', name: 'Leadership', category: 'Soft Skills', description: 'Team mentorship & executive presence' },
  { id: '9', name: 'Communication', category: 'Soft Skills', description: 'Cross-functional collaboration' },
  { id: '10', name: 'Fintech', category: 'Domain', description: 'Financial technology & secure payments' },
  { id: '11', name: 'Healthcare', category: 'Domain', description: 'Medical IT & HIPAA compliance' },
];

export default function CustomSkillsManager() {
  const [customSkills, setCustomSkills] = useState<any[]>(DEFAULT_CUSTOM_SKILLS);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillCategoryFilter, setSkillCategoryFilter] = useState('All');
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Technical');
  const [newSkillDescription, setNewSkillDescription] = useState('');
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editSkillName, setEditSkillName] = useState('');
  const [editSkillCategory, setEditSkillCategory] = useState('');
  const [editSkillDescription, setEditSkillDescription] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCustomSkills();
  }, []);

  const fetchCustomSkills = async () => {
    try {
      const docRef = doc(db, 'settings', 'global');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.customSkills && Array.isArray(data.customSkills)) {
          setCustomSkills(data.customSkills);
        }
      }
    } catch (err) {
      console.error("Error loading custom skills:", err);
    }
  };

  const saveToFirestore = async (updatedSkills: any[]) => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'settings', 'global');
      await setDoc(docRef, { customSkills: updatedSkills, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.error("Error saving custom skills:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    const newSkill = {
      id: Date.now().toString(),
      name: newSkillName.trim(),
      category: newSkillCategory,
      description: newSkillDescription.trim()
    };
    const updated = [newSkill, ...customSkills];
    setCustomSkills(updated);
    setNewSkillName('');
    setNewSkillDescription('');
    setMessage({ type: 'success', text: 'Custom skill added successfully!' });
    await saveToFirestore(updated);
  };

  const handleStartEdit = (skill: any) => {
    setEditingSkillId(skill.id);
    setEditSkillName(skill.name);
    setEditSkillCategory(skill.category);
    setEditSkillDescription(skill.description || '');
  };

  const handleSaveEdit = async (id: string) => {
    const updated = customSkills.map(s => s.id === id ? { ...s, name: editSkillName.trim(), category: editSkillCategory, description: editSkillDescription.trim() } : s);
    setCustomSkills(updated);
    setEditingSkillId(null);
    setMessage({ type: 'success', text: 'Custom skill updated successfully!' });
    await saveToFirestore(updated);
  };

  const handleDeleteSkill = async (id: string) => {
    const updated = customSkills.filter(s => s.id !== id);
    setCustomSkills(updated);
    setMessage({ type: 'success', text: 'Custom skill deleted.' });
    await saveToFirestore(updated);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      await parseAndAddCsv(text);
    };
    reader.readAsText(file);
  };

  const parseAndAddCsv = async (csvText: string) => {
    const lines = csvText.split(/\r?\n/);
    const newSkills = [...customSkills];
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || (i === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('skill')))) continue;
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim());
      if (parts[0]) {
        newSkills.unshift({
          id: Date.now().toString() + Math.random(),
          name: parts[0],
          category: parts[1] || 'Technical',
          description: parts[2] || ''
        });
        count++;
      }
    }
    setCustomSkills(newSkills);
    setMessage({ type: 'success', text: `Successfully imported ${count} custom skills from CSV!` });
    await saveToFirestore(newSkills);
  };

  const handleExportCsv = () => {
    const headers = 'Name,Category,Description\n';
    const rows = customSkills.map(s => `"${s.name}","${s.category}","${s.description || ''}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aurrum_custom_skills.csv';
    a.click();
  };

  const handleDownloadTemplate = () => {
    const templateContent = 'Name,Category,Description\n"React","Technical","Frontend UI library & React ecosystem"\n"Kubernetes","Technical","Container orchestration platform"\n"Agile Project Management","Functional","Sprint planning & backlog grooming"\n"Leadership","Soft Skills","Team mentorship & executive presence"\n"Fintech","Domain","Financial technology & secure payments"';
    const blob = new Blob([templateContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aurrum_custom_skills_template.csv';
    a.click();
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans pb-12">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[var(--card-bg)] to-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[var(--primary-gold)]/15 text-[var(--primary-gold)] border border-[var(--primary-gold)]/30">
              Enterprise Taxonomy
            </span>
            {isSaving && <span className="text-[11px] font-bold text-amber-500 animate-pulse">Saving changes...</span>}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Custom Skills Library
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-2xl font-medium">
            Maintain centralized custom skills categorized by Technical, Functional, Soft Skills, and Domain. Uploaded resumes are automatically matched against these skills during AI parsing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="crm-btn-secondary text-xs px-4 py-2.5 font-bold flex items-center gap-2 shadow-xs"
            title="Download CSV/Excel Import Template with Example Data"
          >
            <Download size={15} className="text-[var(--primary-gold)]" />
            <span>Download CSV Template</span>
          </button>
          <label className="crm-btn-secondary text-xs px-4 py-2.5 font-bold flex items-center gap-2 cursor-pointer shadow-xs">
            <FileSpreadsheet size={15} className="text-[var(--primary-gold)]" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleCsvFileUpload} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleExportCsv}
            className="crm-btn-gold text-xs px-4 py-2.5 font-bold flex items-center gap-2 shadow-md"
          >
            <Download size={15} />
            <span>Export All</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'}`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto text-[10px] uppercase opacity-75 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Add Skill Form */}
      <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm space-y-4">
        <h4 className="font-extrabold text-sm text-[var(--text-primary)] flex items-center gap-2">
          <Plus size={18} className="text-[var(--primary-gold)]" /> Add New Custom Skill
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-[var(--text-muted)] mb-1">Skill Name</label>
            <input
              type="text"
              placeholder="e.g., Kubernetes or GraphQL"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              className="crm-input text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-[var(--text-muted)] mb-1">Category</label>
            <select
              value={newSkillCategory}
              onChange={(e) => setNewSkillCategory(e.target.value)}
              className="crm-input text-xs"
            >
              <option value="Technical">Technical</option>
              <option value="Functional">Functional</option>
              <option value="Soft Skills">Soft Skills</option>
              <option value="Domain">Domain</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-[var(--text-muted)] mb-1">Description</label>
            <input
              type="text"
              placeholder="Brief description or context"
              value={newSkillDescription}
              onChange={(e) => setNewSkillDescription(e.target.value)}
              className="crm-input text-xs"
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleAddSkill}
            className="crm-btn-gold text-xs px-6 py-2.5 font-bold shadow-md flex items-center gap-2"
          >
            <Plus size={16} /> Add Custom Skill
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-xs">
        <input
          type="text"
          placeholder="Search custom skills..."
          value={skillSearch}
          onChange={(e) => setSkillSearch(e.target.value)}
          className="crm-input text-xs max-w-xs"
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          {['All', 'Technical', 'Functional', 'Soft Skills', 'Domain'].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSkillCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                skillCategoryFilter === cat 
                  ? 'bg-[var(--primary-gold)] text-white shadow-xs' 
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--primary-gold)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Skills Table */}
      <div className="crm-table-container rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-sm overflow-hidden">
        <table className="crm-table w-full text-left border-collapse">
          <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
            <tr>
              <th className="p-4 text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">Skill Name</th>
              <th className="p-4 text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">Category</th>
              <th className="p-4 text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">Description</th>
              <th className="p-4 text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)] text-xs">
            {customSkills
              .filter(s => {
                const matchesSearch = s.name.toLowerCase().includes(skillSearch.toLowerCase()) || (s.description || '').toLowerCase().includes(skillSearch.toLowerCase());
                const matchesCat = skillCategoryFilter === 'All' || s.category === skillCategoryFilter;
                return matchesSearch && matchesCat;
              })
              .map(skill => (
                <tr key={skill.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                  <td className="p-4 font-extrabold text-[var(--text-primary)]">
                    {editingSkillId === skill.id ? (
                      <input
                        type="text"
                        value={editSkillName}
                        onChange={(e) => setEditSkillName(e.target.value)}
                        className="crm-input text-xs py-1"
                      />
                    ) : (
                      skill.name
                    )}
                  </td>
                  <td className="p-4">
                    {editingSkillId === skill.id ? (
                      <select
                        value={editSkillCategory}
                        onChange={(e) => setEditSkillCategory(e.target.value)}
                        className="crm-input text-xs py-1"
                      >
                        <option value="Technical">Technical</option>
                        <option value="Functional">Functional</option>
                        <option value="Soft Skills">Soft Skills</option>
                        <option value="Domain">Domain</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-[var(--primary-gold)]/15 text-[var(--primary-gold)] border border-[var(--primary-gold)]/30">
                        {skill.category}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-[var(--text-secondary)] font-medium">
                    {editingSkillId === skill.id ? (
                      <input
                        type="text"
                        value={editSkillDescription}
                        onChange={(e) => setEditSkillDescription(e.target.value)}
                        className="crm-input text-xs py-1"
                      />
                    ) : (
                      skill.description || '—'
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {editingSkillId === skill.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(skill.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSkillId(null)}
                          className="px-3 py-1.5 crm-btn-secondary text-xs font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(skill)}
                          className="p-2 crm-btn-secondary hover:text-[var(--primary-gold)] rounded-lg"
                          title="Edit Skill"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSkill(skill.id)}
                          className="p-2 crm-btn-secondary hover:text-rose-500 rounded-lg"
                          title="Delete Skill"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
