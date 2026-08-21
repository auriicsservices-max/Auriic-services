import { GeminiResumeParser } from './geminiParser.server';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const geminiParser = new GeminiResumeParser();

export interface WebsiteLeadPayload {
  source?: string;
  lead_type?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  service?: string;
  country?: string;
  message?: string;
  resume_url?: string;
  resume_file_name?: string;
  resume_file_type?: string;
  resume_size?: number;
  submitted_at?: string;
}

export interface ParsedResumeSchema {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  current_title: string;
  current_employer: string;
  total_experience_years: number;
  summary: string;
  skills: string[];
  work_history: Array<{
    title: string;
    company: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    field_of_study: string;
    graduation_year: string;
  }>;
  certifications: string[];
  languages: string[];
  parse_confidence: 'high' | 'medium' | 'low';
  parse_warnings: string[];
}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function retryWithBackoff<T>(fn: () => Promise<T>, retries: number = 3, initialDelay: number = 1000): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const errMsg = err?.message || String(err);
      const isRetryable = attempt <= retries && (
        errMsg.includes('timeout') || 
        errMsg.includes('ETIMEDOUT') || 
        errMsg.includes('ECONNRESET') || 
        errMsg.includes('503') || 
        errMsg.includes('502') || 
        errMsg.includes('429')
      );

      if (!isRetryable) {
        throw err;
      }

      const jitter = 0.8 + Math.random() * 0.4;
      const delay = Math.min(10000, initialDelay * Math.pow(2, attempt - 1)) * jitter;
      console.warn(`[LeadWebhookService] Attempt ${attempt} failed (${errMsg}). Retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }
}

export async function fetchAndValidateResume(resumeUrl: string, expectedFileType?: string, expectedSize?: number): Promise<{ buffer: Buffer; mimeType: string }> {
  // 1. SSRF Protection: validate domain is aurrum.co
  try {
    const parsedUrl = new URL(resumeUrl);
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Resume URL must use HTTPS protocol');
    }
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname !== 'aurrum.co' && !hostname.endsWith('.aurrum.co')) {
      throw new Error(`SSRF Prevention: Resume URL domain "${hostname}" is not allowed. Must be aurrum.co`);
    }
  } catch (err: any) {
    throw new Error(`URL validation failed: ${err.message}`);
  }

  // 2. Fetch with 15s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await retryWithBackoff(async () => {
      const res = await fetch(resumeUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'RectechCRM-LeadFetcher/1.0'
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch resume: HTTP ${res.status} ${res.statusText}`);
      }
      return res;
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = response.headers.get('content-type') || expectedFileType || 'application/pdf';
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 3. File Size Validation (Max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (buffer.length > maxSize) {
    throw new Error(`File size (${buffer.length} bytes) exceeds maximum limit of 5MB`);
  }

  if (expectedSize && expectedSize > 0) {
    const tolerance = 512 * 1024; // 512KB tolerance
    if (Math.abs(buffer.length - expectedSize) > tolerance) {
      console.warn(`[LeadWebhookService] File size mismatch warning: downloaded ${buffer.length} vs expected ${expectedSize}`);
    }
  }

  // 4. Magic Byte Validation
  if (buffer.length > 4) {
    const b0 = buffer[0];
    const b1 = buffer[1];
    const b2 = buffer[2];
    const b3 = buffer[3];

    const isPdf = b0 === 0x25 && b1 === 0x50 && b2 === 0x44 && b3 === 0x46; // %PDF
    const isDocxOrZip = b0 === 0x50 && b1 === 0x4b && b2 === 0x03 && b3 === 0x04; // PK.. (DOCX/ZIP)
    const isDocOle = b0 === 0xd0 && b1 === 0xcf && b2 === 0x11 && b3 === 0xe0; // OLE2 (DOC)

    if (!isPdf && !isDocxOrZip && !isDocOle) {
      throw new Error('File magic byte verification failed: Not a valid PDF, DOC, or DOCX document');
    }
  }

  return { buffer, mimeType: contentType };
}

export async function parseResumeToExactSchema(buffer: Buffer, mimeType: string, filename?: string, leadPayload?: WebsiteLeadPayload): Promise<ParsedResumeSchema> {
  const warnings: string[] = [];

  // Try calling official WordPress Resume Parser API first if resume_url is on aurrum.co
  if (leadPayload?.resume_url && (leadPayload.resume_url.includes('aurrum.co'))) {
    try {
      console.log(`[LeadWebhookService] Calling WordPress Resume Parser API for: ${leadPayload.resume_url}`);
      const wpRes = await fetch('https://aurrum.co/wp-json/aurrum/v1/parse-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Aurrum-Api-Key': 'zUq2weZn8XxCB3Bb2wftyCy0uZuHjK49x07zo6DW'
        },
        body: JSON.stringify({ resume_url: leadPayload.resume_url })
      });

      if (wpRes.ok) {
        const wpData = await wpRes.json() as { success: boolean; parsedResume: ParsedResumeSchema };
        if (wpData.success && wpData.parsedResume) {
          console.log('[LeadWebhookService] Successfully parsed resume via WordPress API');
          return wpData.parsedResume;
        }
      } else {
        console.warn(`[LeadWebhookService] WordPress Parse Resume API returned status ${wpRes.status}, falling back to Gemini/local parser.`);
      }
    } catch (wpErr: any) {
      console.warn('[LeadWebhookService] WordPress Parse Resume API error, falling back to Gemini/local parser:', wpErr?.message || wpErr);
    }
  }

  let rawParsed: any;
  try {
    rawParsed = await retryWithBackoff(() => geminiParser.parseBuffer(buffer, mimeType, filename));
  } catch (err: any) {
    console.error('[LeadWebhookService] Gemini parsing failed after retries:', err);
    return {
      full_name: [leadPayload?.first_name, leadPayload?.last_name].filter(Boolean).join(' ') || '',
      email: leadPayload?.email || '',
      phone: leadPayload?.phone || '',
      location: leadPayload?.country || '',
      linkedin_url: '',
      current_title: '',
      current_employer: leadPayload?.company || '',
      total_experience_years: 0,
      summary: leadPayload?.message || '',
      skills: [],
      work_history: [],
      education: [],
      certifications: [],
      languages: [],
      parse_confidence: 'low',
      parse_warnings: [`Gemini parsing failed: ${err.message}`]
    };
  }

  // Map rawParsed to the exact required schema
  const fullName = rawParsed.contact?.full_name || rawParsed.personal_info?.full_name || [leadPayload?.first_name, leadPayload?.last_name].filter(Boolean).join(' ') || '';
  const email = rawParsed.contact?.email || rawParsed.personal_info?.email || leadPayload?.email || '';
  const phone = rawParsed.contact?.mobile || rawParsed.personal_info?.phone || leadPayload?.phone || '';

  // Cross-check email and phone against lead payload
  if (leadPayload?.email && email && leadPayload.email.toLowerCase() !== email.toLowerCase()) {
    warnings.push(`Resume email differs from submitted email: ${email} vs ${leadPayload.email}`);
  }
  if (leadPayload?.phone && phone && leadPayload.phone.replace(/\D/g, '') !== phone.replace(/\D/g, '')) {
    warnings.push(`Resume phone differs from submitted phone: ${phone} vs ${leadPayload.phone}`);
  }

  if (Array.isArray(rawParsed.warnings)) {
    warnings.push(...rawParsed.warnings);
  }

  const workHistory = (rawParsed.work_experience || []).map((w: any) => ({
    title: w.title || w.designation || '',
    company: w.company || '',
    start_date: w.start_date || '',
    end_date: w.end_date || '',
    is_current: !!w.is_current,
    description: w.description || w.summary || ''
  }));

  const education = (rawParsed.education || []).map((e: any) => ({
    degree: e.degree || e.qualification || '',
    institution: e.institution || e.school || '',
    field_of_study: e.field_of_study || e.major || '',
    graduation_year: e.graduation_year || e.end_year || e.year || ''
  }));

  const skillsList: string[] = [];
  if (Array.isArray(rawParsed.skills)) {
    skillsList.push(...rawParsed.skills);
  } else if (rawParsed.technical_skills) {
    Object.values(rawParsed.technical_skills).forEach((val: any) => {
      if (Array.isArray(val)) skillsList.push(...val);
    });
  }
  if (Array.isArray(rawParsed.all_skills)) {
    skillsList.push(...rawParsed.all_skills);
  }

  const uniqueSkills = Array.from(new Set(skillsList.filter(Boolean)));

  const links = rawParsed.links || rawParsed.personal_info?.links || {};
  const linkedinUrl = links.linkedin || '';

  return {
    full_name: fullName,
    email: email || leadPayload?.email || '',
    phone: phone || leadPayload?.phone || '',
    location: rawParsed.contact?.location || rawParsed.personal_info?.location?.city || leadPayload?.country || '',
    linkedin_url: linkedinUrl,
    current_title: rawParsed.contact?.designation || rawParsed.personal_info?.headline || '',
    current_employer: workHistory[0]?.company || leadPayload?.company || '',
    total_experience_years: typeof rawParsed.total_experience_years === 'number' ? rawParsed.total_experience_years : 0,
    summary: rawParsed.professional_summary || leadPayload?.message || '',
    skills: uniqueSkills,
    work_history: workHistory,
    education: education,
    certifications: Array.isArray(rawParsed.certifications) ? rawParsed.certifications : [],
    languages: Array.isArray(rawParsed.languages) ? rawParsed.languages : [],
    parse_confidence: rawParsed.parsing_confidence || (warnings.length > 0 ? 'medium' : 'high'),
    parse_warnings: warnings
  };
}

export async function processWebsiteLead(payload: WebsiteLeadPayload, db: admin.firestore.Firestore): Promise<{ success: boolean; candidateId?: string; error?: string }> {
  try {
    let parsedResume: ParsedResumeSchema | null = null;
    let resumeFetchError: string | null = null;

    if (payload.resume_url && payload.resume_url.trim() !== '') {
      try {
        console.log(`[LeadWebhookService] Processing resume from URL: ${payload.resume_url}`);
        const { buffer, mimeType } = await fetchAndValidateResume(payload.resume_url, payload.resume_file_type, payload.resume_size);
        parsedResume = await parseResumeToExactSchema(buffer, mimeType, payload.resume_file_name, payload);
      } catch (resumeErr: any) {
        resumeFetchError = resumeErr.message;
        console.warn(`[LeadWebhookService] Resume fetch/parse failed for lead (${payload.email}):`, resumeFetchError);
      }
    }

    const candidateData = {
      source: payload.source || 'website',
      leadType: payload.lead_type || 'website_contact_form_lead',
      firstName: payload.first_name || (parsedResume?.full_name ? parsedResume.full_name.split(' ')[0] : ''),
      lastName: payload.last_name || (parsedResume?.full_name ? parsedResume.full_name.split(' ').slice(1).join(' ') : ''),
      name: parsedResume?.full_name || [payload.first_name, payload.last_name].filter(Boolean).join(' ') || 'Website Lead',
      email: payload.email || parsedResume?.email || '',
      phone: payload.phone || parsedResume?.phone || '',
      company: payload.company || parsedResume?.current_employer || '',
      service: payload.service || '',
      country: payload.country || parsedResume?.location || '',
      message: payload.message || '',
      resumeUrl: payload.resume_url || '',
      resumeFileName: payload.resume_file_name || '',
      resumeFileType: payload.resume_file_type || '',
      resumeSize: payload.resume_size || 0,
      submittedAt: payload.submitted_at || new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'New Lead',
      stage: 'Sourced',
      rating: 0,
      parsedResume: parsedResume || null,
      resumeFetchError: resumeFetchError || null
    };

    const docRef = await db.collection('candidates').add(candidateData);
    console.log(`[LeadWebhookService] Successfully created candidate record ${docRef.id} for lead ${candidateData.email}`);

    // Also record lead in activity logs
    await db.collection('activityLogs').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      user: 'Website Webhook',
      action: 'Website Lead Captured',
      details: `New lead received from ${candidateData.email} (${candidateData.leadType})${parsedResume ? ' with parsed resume' : ''}`,
      candidateId: docRef.id,
      category: 'lead'
    }).catch(() => {});

    return { success: true, candidateId: docRef.id };
  } catch (err: any) {
    console.error('[LeadWebhookService] Error processing website lead:', err);
    return { success: false, error: err.message };
  }
}
