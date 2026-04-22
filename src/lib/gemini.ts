import { extractTextFromPDF, extractTextFromDocx, parseResumeHeuristically, ParsedResume } from "./localParser";

export async function parseResume(fileData: { mimeType: string; data: string | ArrayBuffer } | string): Promise<ParsedResume> {
  let text = '';

  if (typeof fileData === 'string') {
    text = fileData;
  } else {
    let buffer: ArrayBuffer;
    if (fileData.data instanceof ArrayBuffer) {
      buffer = fileData.data;
    } else {
      // Convert base64 to ArrayBuffer
      const binaryString = atob(fileData.data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }
      buffer = bytes.buffer;
    }

    console.log('Parsing file with mimeType:', fileData.mimeType, 'Buffer size:', buffer.byteLength);

    if (fileData.mimeType === 'application/pdf') {
      text = await extractTextFromPDF(buffer);
    } else if (
      fileData.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileData.mimeType === 'application/msword'
    ) {
      text = await extractTextFromDocx(buffer);
    } else {
      // Fallback: assume it's plain text or try to decode it
      text = new TextDecoder().decode(buffer);
    }
  }

  return await parseResumeHeuristically(text);
}
