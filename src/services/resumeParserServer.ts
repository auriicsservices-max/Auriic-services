import * as mammoth from 'mammoth';
import { parseResumeHeuristically } from '../lib/localParser';

// Use dynamic import for pdf-parse
async function parseWithPdfParse(buffer: Buffer): Promise<string> {
    const pdfParse = (await import('pdf-parse'));
    // Handle both default import and direct export
    const parser = (pdfParse as any).default || (pdfParse as any).pdf || pdfParse;
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
            text = await parseWithPdfParse(buffer);
        } catch (e) {
            try {
                text = await parseWithPdfJs(buffer);
            } catch (fallbackErr) {
                // Ultimate fallback: extract ASCII strings from buffer
                try {
                    const latin = buffer.toString('latin1');
                    const matches = latin.match(/[A-Za-z0-9@.,\s_-]{4,}/g);
                    text = matches ? matches.join(' ') : buffer.toString('utf-8');
                } catch (bErr) {
                    text = buffer.toString('utf-8');
                }
            }
        }
    } else if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
        try {
            const result = await mammoth.extractRawText({ buffer: buffer });
            text = result.value || '';
        } catch (e) {
            try {
                const latin = buffer.toString('latin1');
                const matches = latin.match(/[A-Za-z0-9@.,\s_-]{4,}/g);
                text = matches ? matches.join(' ') : buffer.toString('utf-8');
            } catch (innerErr) {
                text = buffer.toString('utf-8');
            }
        }
    } else {
        text = buffer.toString('utf-8');
    }
    return text && text.trim().length > 0 ? text : 'Candidate Resume';
}

export async function parseResumeFromBuffer(buffer: Buffer, mimeType: string): Promise<any> {
    const text = await extractRawTextFromBuffer(buffer, mimeType);
    return await parseResumeHeuristically(text);
}
