
export function formatUKDate(date: string | Date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
        timeZone: 'Europe/London',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}
