export async function parseResume(fileData: { mimeType: string; data: string } | string) {
  try {
    const response = await fetch('/api/parse-resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileData }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Parsing failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Client Gemini Error:", error);
    throw error;
  }
}
