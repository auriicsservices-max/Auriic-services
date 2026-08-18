export function calculateTotalExperienceYears(workExperience: any[]): number {
  if (!Array.isArray(workExperience) || workExperience.length === 0) {
    return 0;
  }

  const intervals: { start: number; end: number }[] = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  const parseDateToMonths = (dateStr: string, isEnd: boolean): number | null => {
    if (!dateStr) return null;
    const str = String(dateStr).toLowerCase().trim();
    if (/present|current|now|till\s*date|ongoing|to\s*date/i.test(str)) {
      return currentYear * 12 + currentMonth;
    }

    const yearMatches = str.match(/\b(19|20)\d{2}\b/g);
    if (!yearMatches || yearMatches.length === 0) return null;

    const year = parseInt(yearMatches[yearMatches.length - 1], 10);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    let monthIdx = months.findIndex(m => str.includes(m));

    if (monthIdx === -1) {
      const parts = str.split(/[\/\-\.\s]+/);
      for (const p of parts) {
        const num = parseInt(p, 10);
        if (!isNaN(num) && num >= 1 && num <= 12 && p.length <= 2) {
          monthIdx = num - 1;
          break;
        }
      }
    }

    if (monthIdx === -1) {
      monthIdx = isEnd ? 11 : 0;
    }

    return year * 12 + monthIdx;
  };

  for (const exp of workExperience) {
    const startDateStr = String(exp.start_date || exp.startDate || exp.from || '');
    const endDateStr = String(exp.end_date || exp.endDate || exp.to || '');
    const isCurrent = exp.is_current || exp.isCurrent || /present|current|now|till\s*date|ongoing/i.test(endDateStr);

    const startMonths = parseDateToMonths(startDateStr, false);
    if (startMonths === null) continue;

    let endMonths: number | null = null;
    if (isCurrent) {
      endMonths = currentYear * 12 + currentMonth;
    } else {
      endMonths = parseDateToMonths(endDateStr, true);
    }

    if (endMonths === null) {
      endMonths = startMonths + 12;
      if (endMonths > currentYear * 12 + currentMonth) {
        endMonths = currentYear * 12 + currentMonth;
      }
    }

    if (endMonths >= startMonths) {
      intervals.push({ start: startMonths, end: endMonths });
    }
  }

  if (intervals.length === 0) {
    return 0;
  }

  // Sort intervals by start date
  intervals.sort((a, b) => a.start - b.start);

  // Merge overlapping intervals to prevent double-counting
  const merged: { start: number; end: number }[] = [];
  let current = intervals[0];

  for (let i = 1; i < intervals.length; i++) {
    const next = intervals[i];
    if (next.start <= current.end) {
      current.end = Math.max(current.end, next.end);
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  let totalMonths = 0;
  for (const interval of merged) {
    totalMonths += (interval.end - interval.start);
  }

  const totalYears = totalMonths / 12;
  return Math.round(Math.min(50, Math.max(0, totalYears)) * 10) / 10;
}

export function getMissingDetails(c: any): string[] {
  const missing: string[] = [];
  if (!c.fullName || c.fullName === 'Unknown Candidate' || c.fullName === 'Candidate Resume') {
    missing.push('Full Name');
  }
  if (!c.email || !c.email.includes('@')) {
    missing.push('Email');
  }
  const workExp = c.work_experience || c.workExperience || [];
  if (workExp.length === 0 && (!c.totalExperience || c.totalExperience === 0)) {
    missing.push('Work Experience');
  }
  const skills = c.skills || {};
  const allSkills = c.all_skills || [];
  if (Object.keys(skills).length === 0 && allSkills.length === 0) {
    missing.push('Skills');
  }
  if (!c.summary || c.summary.length < 10) {
    missing.push('Professional Summary');
  }
  if (c.missing_fields && Array.isArray(c.missing_fields)) {
    for (const f of c.missing_fields) {
      if (!missing.includes(f)) missing.push(f);
    }
  }
  return missing;
}

