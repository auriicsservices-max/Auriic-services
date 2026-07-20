import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import * as mammoth from 'mammoth';
import { parseResumeHeuristically } from '../lib/localParser';

export async function parseResumeFromBuffer(buffer: Buffer, mimeType: string): Promise<any> {
    let text = '';
    
    if (mimeType === 'application/pdf') {
        const data = await pdfParse(buffer);
        text = data.text;
    } else if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
        const result = await mammoth.extractRawText({ buffer: buffer });
        text = result.value;
    } else {
        text = buffer.toString('utf-8');
    }

    return await parseResumeHeuristically(text);
}
