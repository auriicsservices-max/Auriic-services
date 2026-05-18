export async function fetchCvList() {
    try {
        // Use local proxy to avoid CORS and include AURRUM_API_KEY via server
        const response = await fetch('/api/cv/list');
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error('Expected JSON but got:', text.slice(0, 100));
            return [];
        }
        const data = await response.json();
        if (data.status) {
            return data.data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching CV list:', error);
        return [];
    }
}
