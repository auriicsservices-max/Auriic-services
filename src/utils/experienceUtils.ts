export function calculateTotalExperienceYears(workExperience: any[]): number {
  if (!Array.isArray(workExperience) || workExperience.length === 0) {
    return 0;
  }

  let totalYears = 0;
  const currentYear = new Date().getFullYear();

  for (const exp of workExperience) {
    const startDateStr = String(exp.start_date || exp.startDate || '');
    const endDateStr = String(exp.end_date || exp.endDate || '');
    const isCurrent = exp.is_current || exp.isCurrent || /present|current|now|till\s*date/i.test(endDateStr);

    const startYears = startDateStr.match(/\b(19|20)\d{2}\b/g);
    const endYears = endDateStr.match(/\b(19|20)\d{2}\b/g);

    let startYear = startYears ? parseInt(startYears[0], 10) : 0;
    let endYear = 0;

    if (isCurrent) {
      endYear = currentYear;
    } else if (endYears) {
      endYear = parseInt(endYears[0], 10);
    } else if (startYear > 0) {
      endYear = startYear + 1;
    }

    if (startYear > 0 && endYear >= startYear) {
      let tenure = endYear - startYear;
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const startMonthMatch = months.findIndex(m => startDateStr.toLowerCase().includes(m));
      const endMonthMatch = months.findIndex(m => endDateStr.toLowerCase().includes(m));

      if (startMonthMatch !== -1 && endMonthMatch !== -1 && endYear > startYear) {
        let monthDiff = (endYear - startYear) * 12 + (endMonthMatch - startMonthMatch);
        tenure = Math.max(0.5, monthDiff / 12);
      } else if (tenure === 0) {
        tenure = 1;
      }
      totalYears += tenure;
    }
  }

  if (totalYears === 0 && workExperience.length > 0) {
    totalYears = workExperience.length * 1.5;
  }

  return Math.round(Math.min(40, totalYears) * 10) / 10;
}
