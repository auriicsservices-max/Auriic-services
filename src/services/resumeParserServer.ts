import * as pdfParseModule from 'pdf-parse';
import * as mammoth from 'mammoth';
import { parseResumeHeuristically } from '../lib/localParser';

// Resolve pdf-parse correctly in both ESM (dev) and CommonJS (prod bundle)
async function getPDFParser(): Promise<any> {
  // 1. Try checking the statically imported module namespace
  const mod = pdfParseModule as any;
  if (typeof mod === 'function') {
    return mod;
  }
  if (mod && typeof mod.default === 'function') {
    return mod.default;
  }
  if (mod && mod.default && typeof mod.default.default === 'function') {
    return mod.default.default;
  }

  // 2. Try dynamic import
  try {
    const imported = (await import('pdf-parse')) as any;
    if (typeof imported === 'function') return imported;
    if (imported && typeof imported.default === 'function') return imported.default;
    if (imported && imported.default && typeof imported.default.default === 'function') {
      return imported.default.default;
    }
  } catch (e) {
    // ignore
  }

  // 3. Try dynamic require if in CommonJS environment or tsx
  try {
    if (typeof require !== 'undefined') {
      const required = require('pdf-parse');
      if (typeof required === 'function') return required;
      if (required && typeof required.default === 'function') return required.default;
    }
  } catch (e) {
    // ignore
  }

  // 4. Try node module bridge
  try {
    const { createRequire } = await import('module');
    const requireBridge = createRequire(import.meta.url);
    const required = requireBridge('pdf-parse');
    if (typeof required === 'function') return required;
    if (required && typeof required.default === 'function') return required.default;
  } catch (e) {
    // ignore
  }

  throw new Error("PDF parsing library (pdf-parse) not available or could not be loaded");
}

export async function parseResumeFromBuffer(buffer: Buffer, mimeType: string): Promise<any> {
    let text = '';
    
    if (mimeType === 'application/pdf') {
        const pdfLib = await getPDFParser();
        const data = await pdfLib(buffer);
        text = data.text;
    } else if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
        const result = await mammoth.extractRawText({ buffer: buffer });
        text = result.value;
    } else {
        text = buffer.toString('utf-8');
    }

    return await parseResumeHeuristically(text);
}
