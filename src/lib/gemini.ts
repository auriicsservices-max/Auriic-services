import { extractTextFromPDF, extractTextFromDocx, parseResumeHeuristically, ParsedResume } from "./localParser";

export async function parseResume(fileData: { mimeType: string; data: string } | string): Promise<ParsedResume> {
  let text = '';

  if (typeof fileData === 'string') {
    text = fileData;
  } else {
    // Convert base64 to ArrayBuffer
    const binaryString = atob(fileData.data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const buffer = bytes.buffer;

    if (fileData.mimeType === 'application/pdf') {
      text = await extractTextFromPDF(buffer);
    } else if (
      fileData.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileData.mimeType === 'application/msword'
    ) {
      text = await extractTextFromDocx(buffer);
    } else {
      // Fallback: assume it's plain text or try to decode it
      text = new TextDecoder().decode(bytes);
    }
  }

  return await parseResumeHeuristically(text);
}
