export async function parseResume(fileData: { mimeType: string; data: string } | string) {
  console.log('[Aurrum AI] Using Proxy V2 (Secure Server-side)');
  const response = await fetch('/api/v2/parse-resume', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileData }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Server responded with ${response.status}`);
  }

  return response.json();
}
