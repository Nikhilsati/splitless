import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() : 'id_' + Math.random().toString(36).substr(2, 9);
}

export function extractSheetId(input: string): string | null {
    // If it's just an ID
    if (/^[a-zA-Z0-9-_]{44}$/.test(input)) {
        return input;
    }
    // If it's a full URL
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
        return match[1];
    }
    return null;
}

export function formatCurrency(amount: number): string {
    const absAmount = Math.abs(amount);
    if (absAmount >= 100000) {
        const lakhs = absAmount / 100000;
        // Format to max 2 decimal places and add 'L'
        const formattedLakhs = lakhs.toLocaleString('en-IN', { maximumFractionDigits: 2 });
        return `${amount < 0 ? '-' : ''}${formattedLakhs}L`;
    }
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getTimestamp(date: string | number | undefined): number {
    if (!date) return 0;
    const num = Number(date);
    if (!isNaN(num) && num > 30000 && num < 60000) {
        // Sheets serial date: days since Dec 30, 1899
        return (num - 25569) * 86400 * 1000;
    }
    const d = new Date(date);
    return isNaN(d.getTime()) ? 0 : d.getTime();
}

export function formatDate(date: string | number | undefined): string {
    if (!date) return '';
    const ts = getTimestamp(date);
    if (ts === 0 && date !== 0) return String(date);
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}
