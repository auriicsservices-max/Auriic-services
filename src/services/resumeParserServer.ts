import * as mammoth from 'mammoth';
import { parseResumeHeuristically } from '../lib/localParser';

// Use dynamic import for pdf-parse
async function parseWithPdfParse(buffer: Buffer): Promise<string> {
    const pdfParse = (await import('pdf-parse'));
    // Handle both default import and direct export
    const parser = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || (pdfParse as any).pdf || pdfParse);
    const data = await parser(buffer);
    return data.text || '';
}

// Fallback to pdfjs-dist
async function parseWithPdfJs(buffer: Buffer): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');
    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += (content as any).items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text;
}

export async function extractRawTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    let text = '';
    if (mimeType === 'application/pdf') {
        // Try Primary
        try {
            console.log('[resumeParserServer] Attempting PDF parsing with pdf-parse...');
            text = await parseWithPdfParse(buffer);
            console.log('[resumeParserServer] PDF parsing successful with pdf-parse.');
        } catch (e) {
            console.warn('[resumeParserServer] pdf-parse failed, attempting fallback to pdfjs-dist:', e);
            // Try Fallback
            try {
                text = await parseWithPdfJs(buffer);
                console.log('[resumeParserServer] PDF parsing successful with pdfjs-dist.');
            } catch (fallbackErr) {
                console.error('[resumeParserServer] All PDF parsing methods failed:', fallbackErr);
                throw new Error('All PDF parsing methods failed');
            }
        }
    } else if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
        try {
            const result = await mammoth.extractRawText({ buffer: buffer });
            text = result.value || '';
        } catch (e) {
            console.warn('[resumeParserServer] Docx text extraction failed:', e);
            throw new Error('Docx extraction failed');
        }
    } else {
        text = buffer.toString('utf-8');
    }
    return text;
}

export async function parseResumeFromBuffer(buffer: Buffer, mimeType: string): Promise<any> {
    const text = await extractRawTextFromBuffer(buffer, mimeType);
    return await parseResumeHeuristically(text);
}
