import React, { useState } from 'react';
import { Code, CheckCircle, AlertCircle, Sparkles, Upload, Copy, FileText, ShieldAlert } from 'lucide-react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import LZString from 'lz-string';

export const JsonResumeUploader: React.FC = () => {
  const [jsonText, setJsonText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { user, role } = useAuth();

  const sampleJsonArray = [
    {
      "fullName": "Raven Fuller",
      "email": "ravenlfuller@gmail.com",
      "phone": "832-800-7194",
      "locationInfo": {
        "city": "Houston",
        "state": "TX",
        "country": "United States"
      },
      "summary": "Talent Acquisition Partner with extensive experience in full life-cycle recruitment.",
      "domainFocus": "Human Resources / Talent Acquisition",
      "primaryRole": "Talent Acquisition Partner",
      "totalExperience": 9.0,
      "careerLevel": "Senior / Mid-Senior",
      "skills": ["Talent Acquisition", "University Relations", "Full Life-Cycle Recruitment"],
      "experience": [
        {
          "job_title": "University Relations & Talent Acquisition Partner",
          "company": "TotalEnergies",
          "location": "Houston, TX",
          "start_date": "2023",
          "end_date": "Current",
          "is_current": true,
          "responsibilities": ["Maintain relationships with higher education institutional partners."]
        }
      ],
      "education": [
        {
          "degree": "Bachelor of Arts in Communications",
          "school": "University of Texas at San Antonio"
        }
      ],
      "links": {
        "linkedin": "https://linkedin.com/in/ravenfuller"
      },
      "rawResumeText": "RAVEN FULLER\n832-800-7194 | ravenlfuller@gmail.com\nTalent Acquisition Partner",
      "fileName": "Raven_Fuller_Resume.pdf"
    },
    {
      "fullName": "Alex Morgan",
      "email": "alex.morgan@example.com",
      "phone": "555-019-2834",
      "locationInfo": {
        "city": "Austin",
        "state": "TX",
        "country": "United States"
      },
      "summary": "Senior Software Engineer specialized in React, TypeScript, and Cloud Architecture.",
      "domainFocus": "Engineering",
      "primaryRole": "Senior Frontend Engineer",
      "totalExperience": 7.5,
      "careerLevel": "Senior",
      "skills": ["React", "TypeScript", "Node.js", "Tailwind CSS"],
      "experience": [
        {
          "job_title": "Senior Frontend Engineer",
          "company": "CloudScale",
          "location": "Austin, TX",
          "start_date": "2021",
          "end_date": "Current",
          "is_current": true,
          "responsibilities": ["Built scalable design systems and enterprise dashboards."]
        }
      ],
      "education": [
        {
          "degree": "B.S. Computer Science",
          "school": "University of Texas at Austin"
        }
      ],
      "links": {
        "linkedin": "https://linkedin.com/in/alexmorgan",
        "github": "https://github.com/alexmorgan"
      },
      "rawResumeText": "ALEX MORGAN\n555-019-2834 | alex.morgan@example.com\nSenior Software Engineer",
      "fileName": "Alex_Morgan_Resume.pdf"
    }
  ];

  const handleLoadSample = () => {
    setJsonText(JSON.stringify(sampleJsonArray, null, 2));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!jsonText.trim()) {
      setErrorMessage('Please enter or paste valid JSON resume data.');
      return;
    }

    let cleanText = jsonText.trim();
    const lastBrace = cleanText.lastIndexOf('}');
    const lastBracket = cleanText.lastIndexOf(']');
    const lastValidIdx = Math.max(lastBrace, lastBracket);
    if (lastValidIdx !== -1 && lastValidIdx < cleanText.length - 1) {
      cleanText = cleanText.substring(0, lastValidIdx + 1);
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanText);
    } catch (err: any) {
      setErrorMessage(`Invalid JSON format: ${err.message}`);
      return;
    }

    const items = Array.isArray(parsedData) ? parsedData : [parsedData];

    if (items.length === 0) {
      setErrorMessage('JSON does not contain any candidate records.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Fetch existing candidates to check for duplicates
      const existingSnapshot = await getDocs(collection(db, 'candidates'));
      const existingEmails = new Set<string>();
      const existingNamePhones = new Set<string>();

      existingSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.email) {
          existingEmails.add(data.email.trim().toLowerCase());
        }
        if (data.fullName && data.phone) {
          existingNamePhones.add(`${data.fullName.trim().toLowerCase()}_${data.phone.trim()}`);
        }
      });

      let addedCount = 0;
      let duplicateCount = 0;

      for (const item of items) {
        if (!item.fullName && !item.email && !item.name) {
          continue;
        }

        const fullName = (item.fullName || item.name || 'Unnamed Candidate').trim();
        const email = (item.email || '').trim().toLowerCase();
        const phone = (item.phone || '').trim();

        // Duplicate check
        const isDuplicateEmail = email && existingEmails.has(email);
        const isDuplicateNamePhone = fullName && phone && existingNamePhones.has(`${fullName.toLowerCase()}_${phone}`);

        if (isDuplicateEmail || isDuplicateNamePhone) {
          duplicateCount++;
          continue;
        }

        const rawText = item.rawResumeText || JSON.stringify(item, null, 2);
        const compressed = item.compressedText || LZString.compressToUTF16(rawText);
        
        let base64Data = item.cvBase64 || '';
        if (!base64Data) {
          const textBlob = new Blob([rawText], { type: 'text/plain' });
          base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(textBlob);
          });
        }

        const candidatePayload = {
          fullName,
          email: email || 'pending@aurrum.co',
          phone,
          locationInfo: item.locationInfo || { city: '', state: '', country: '' },
          summary: item.summary || item.professional_summary || '',
          domainFocus: item.domainFocus || 'General',
          primaryRole: item.primaryRole || item.role || 'Candidate',
          totalExperience: Number(item.totalExperience || item.total_experience_years) || 0,
          careerLevel: item.careerLevel || 'Mid-Senior',
          skills: Array.isArray(item.skills) ? item.skills : [],
          categorizedSkills: item.categorizedSkills || { languages: [], frameworks: [], databases: [], tools: [], libraries: [], other: [] },
          experience: Array.isArray(item.experience) ? item.experience : [],
          education: Array.isArray(item.education) ? item.education : [],
          projects: Array.isArray(item.projects) ? item.projects : [],
          certifications: Array.isArray(item.certifications) ? item.certifications : [],
          languages: Array.isArray(item.languages) ? item.languages : [],
          links: item.links || { linkedin: '', github: '', portfolio: '', website: '', other: [] },
          rawResumeText: rawText,
          compressedText: compressed,
          cvBase64: base64Data,
          isLargeFile: Boolean(item.isLargeFile),
          fileName: item.fileName || `${fullName} Resume.pdf`,
          originalFileName: item.originalFileName || `${fullName} Resume.pdf`,
          fileType: item.fileType || 'application/pdf',
          url: item.url || '',
          uploadedBy: item.uploadedBy || user?.uid || 'System',
          createdAt: item.createdAt || new Date().toISOString(),
          isShortlisted: Boolean(item.isShortlisted),
          isArchived: Boolean(item.isArchived),
          aiAnalyzed: true,
          needsReview: false
        };

        await addDoc(collection(db, 'candidates'), candidatePayload);
        
        // Add to local duplicate check sets in case JSON itself has duplicates
        if (email) existingEmails.add(email);
        if (fullName && phone) existingNamePhones.add(`${fullName.toLowerCase()}_${phone}`);
        
        addedCount++;
      }

      if (addedCount === 0 && duplicateCount === 0) {
        setErrorMessage('No valid candidate records with fullName or email found in JSON.');
      } else {
        let msg = `Successfully added ${addedCount} new candidate(s) to Firebase!`;
        if (duplicateCount > 0) {
          msg += ` Skipped ${duplicateCount} duplicate(s) already existing in database.`;
        }
        setSuccessMessage(msg);
        setJsonText('');
      }
    } catch (err: any) {
      console.error('Error storing JSON resumes:', err);
      setErrorMessage(`Failed to store resumes in database: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[var(--primary-gold)]">
              <Code size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Direct JSON Resume Uploader</h2>
              <p className="text-xs text-[var(--text-secondary)]">Paste any JSON resume structure (such as Raven Fuller's profile) to store in Firestore with full resume viewer support.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLoadSample}
            className="crm-btn-secondary text-xs px-3.5 py-2 flex items-center gap-2"
          >
            <Sparkles size={14} className="text-[var(--primary-gold)]" />
            Load Raven Fuller Sample
          </button>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl flex items-center gap-3 text-sm font-semibold">
            <CheckCircle size={18} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl flex items-center gap-3 text-sm font-semibold">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase text-[var(--text-secondary)] tracking-wider">
                Resume JSON Payload
              </label>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(jsonText);
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--primary-gold)] flex items-center gap-1 font-semibold transition-colors"
              >
                <Copy size={12} /> Copy JSON
              </button>
            </div>
            <textarea
              rows={16}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={`Paste your JSON resume structure here...\n{\n  "fullName": "Raven Fuller",\n  "email": "ravenlfuller@gmail.com",\n  ...\n}`}
              className="w-full crm-input font-mono text-xs leading-relaxed p-4 bg-[var(--bg-secondary)]"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setJsonText('')}
              className="crm-btn-secondary text-xs px-4 py-2.5 font-semibold"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="crm-btn-gold text-xs px-6 py-2.5 font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
            >
              <Upload size={14} />
              {isSubmitting ? 'Storing in Database...' : 'Store Resume in Firebase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
