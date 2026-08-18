export interface ParsingQualityReport {
  score: number; // 0 to 100
  completeness: 'high' | 'medium' | 'low';
  missingFields: string[];
  needsReview: boolean;
  reviewReasons: string[];
}

export function evaluateParsingQuality(parsedData: any, rawText: string): ParsingQualityReport {
  const missingFields: string[] = [];
  const reviewReasons: string[] = [];
  let score = 100;

  const fullName = parsedData.personal_info?.full_name || parsedData.contact?.full_name;
  if (!fullName || fullName === 'Unknown Candidate' || fullName === 'Candidate Resume') {
    missingFields.push('Full Name');
    score -= 20;
    reviewReasons.push('Candidate full name could not be reliably extracted.');
  }

  const email = parsedData.personal_info?.email || parsedData.contact?.email;
  if (!email || !email.includes('@')) {
    missingFields.push('Email Address');
    score -= 15;
    reviewReasons.push('Email address is missing or invalid.');
  }

  const workExp = parsedData.work_experience || [];
  if (workExp.length === 0) {
    if (/\b(experience|employment|work history|job title|company|developer|engineer|manager)\b/i.test(rawText)) {
      missingFields.push('Work Experience');
      score -= 25;
      reviewReasons.push('Work experience section appears missing or unextracted despite CV text content.');
    } else {
      score -= 10;
    }
  }

  const education = parsedData.education || [];
  if (education.length === 0) {
    if (/\b(university|college|degree|bachelor|master|phd|b.tech|m.tech|bsc|msc)\b/i.test(rawText)) {
      missingFields.push('Education');
      score -= 15;
      reviewReasons.push('Education section appears missing or unextracted.');
    }
  }

  const allSkills = parsedData.all_skills || [];
  if (allSkills.length === 0) {
    missingFields.push('Skills');
    score -= 15;
    reviewReasons.push('Technical skills list is empty.');
  }

  const summary = parsedData.professional_summary;
  if (!summary || summary.length < 10) {
    missingFields.push('Professional Summary');
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));
  const completeness = score >= 85 ? 'high' : score >= 60 ? 'medium' : 'low';
  const needsReview = score < 75 || reviewReasons.length > 0;

  return {
    score,
    completeness,
    missingFields,
    needsReview,
    reviewReasons
  };
}
