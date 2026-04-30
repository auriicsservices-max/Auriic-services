export async function fetchCvList() {
    try {
        const response = await fetch('https://aurrum.co/wp-json/cv-api/v1/list');
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
