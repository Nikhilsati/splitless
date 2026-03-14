import { gapi } from 'gapi-script';
import type { Expense, Member, Settlement, BalanceSummary } from '../types';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ''; // Optional: if using API key fallback
const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];

export const sheetsService = {
    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: DISCOVERY_DOCS,
                    });
                    resolve();
                } catch (error) {
                    console.error("Error initializing GAPI client", error);
                    reject(error);
                }
            });
        });
    },

    setToken(accessToken: string): void {
        gapi.client.setToken({ access_token: accessToken });
        this._isSignedIn = true;
    },

    _isSignedIn: false,

    isSignedIn(): boolean {
        return this._isSignedIn;
    },

    signOut(): void {
        gapi.client.setToken(null);
        this._isSignedIn = false;
    },

    async setupInitialSheet(spreadsheetId: string): Promise<void> {
        // 1. Get the current sheets to see what's missing
        const response = await gapi.client.sheets.spreadsheets.get({
            spreadsheetId
        });

        const existingTitles = (response.result.sheets || []).map((s: any) => s.properties?.title || '');
        const requiredSheets = ['expenses', 'members', 'settlements', 'summary', 'tags'];

        const requests: any[] = [];

        // Add missing sheets
        for (const title of requiredSheets) {
            if (!existingTitles.includes(title)) {
                requests.push({
                    addSheet: {
                        properties: { title: title }
                    }
                });
            }
        }

        if (requests.length > 0) {
            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: { requests }
            });
        }

        // Now set headers for the specific sheets if they were empty
        // For simplicity we just do values.append for the headers, ensuring we only do it if the sheet is empty
        await this.ensureHeaders(spreadsheetId, 'expenses', ['id', 'date', 'description', 'amount', 'currency', 'paid_by', 'category', 'split_type', 'split_json', 'notes', 'created_at', 'tag']);
        await this.ensureHeaders(spreadsheetId, 'members', ['name', 'joined_at']);
        await this.ensureHeaders(spreadsheetId, 'settlements', ['id', 'date', 'paid_by', 'paid_to', 'amount', 'notes']);
        await this.ensureHeaders(spreadsheetId, 'tags', ['name']);
    },

    async ensureHeaders(spreadsheetId: string, range: string, headers: string[]): Promise<void> {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${range}!A1:Z1` // Check first row
        });

        const existingHeaders = response.result.values?.[0] || [];

        // If length is different or any required header is missing, update headers
        const needsUpdate = headers.some((h, i) => existingHeaders[i] !== h);

        if (needsUpdate) {
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${range}!A1`,
                valueInputOption: 'RAW',
                resource: {
                    values: [headers]
                }
            });
        }
    },

    async getExpenses(spreadsheetId: string): Promise<Expense[]> {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'expenses!A2:L'
        });

        const rows = response.result.values || [];
        return rows.map((row: any[]) => ({
            id: row[0],
            date: row[1],
            description: row[2],
            amount: Number(row[3]),
            currency: row[4],
            paid_by: row[5],
            category: row[6],
            split_type: row[7],
            split_json: JSON.parse(row[8] || '{}'),
            notes: row[9],
            created_at: row[10],
            tag: row[11] || '' // Handle missing tag column in legacy data
        })).reverse(); // Newest first
    },

    async getMembers(spreadsheetId: string): Promise<Member[]> {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'members!A2:B'
        });

        const rows = response.result.values || [];
        return rows.map((row: any[]) => ({
            name: row[0],
            joined_at: row[1]
        }));
    },

    async getSettlements(spreadsheetId: string): Promise<Settlement[]> {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'settlements!A2:F'
        });

        const rows = response.result.values || [];
        return rows.map((row: any[]) => ({
            id: row[0],
            date: row[1], // Assuming date is stored as an ISO string
            paid_by: row[2],
            paid_to: row[3],
            amount: Number(row[4]),
            notes: row[5]
        }));
    },

    async getTags(spreadsheetId: string): Promise<string[]> {
        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'tags!A2:A'
            });

            const rows = response.result.values || [];
            return rows.map((row: any[]) => row[0]);
        } catch (error) {
            // If sheet doesn't exist or range is invalid, return empty tags
            console.warn("Tags sheet not found or inaccessible, returning empty array", error);
            return [];
        }
    },

    async addMember(spreadsheetId: string, member: Member): Promise<void> {
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'members!A:B',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[member.name, new Date(member.joined_at).toISOString()]] // Normalize to ISO string
            }
        });
    },

    async addExpense(spreadsheetId: string, expense: Expense): Promise<void> {
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'expenses!A:L',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[
                    expense.id,
                    new Date(expense.date).toISOString(), // Normalize to ISO string
                    expense.description,
                    expense.amount,
                    expense.currency,
                    expense.paid_by,
                    expense.category,
                    expense.split_type,
                    JSON.stringify(expense.split_json),
                    expense.notes || '',
                    expense.created_at,
                    expense.tag || ''
                ]]
            }
        });
    },

    async updateExpense(spreadsheetId: string, expense: Expense): Promise<void> {
        // 1. Get the current IDs to find the row index
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'expenses!A:A'
        });

        const ids = response.result.values || [];
        const rowIndex = ids.findIndex((row: any[]) => row[0] === expense.id);

        if (rowIndex === -1) {
            // If not found by ID (maybe manually deleted in sheet?), append it
            return this.addExpense(spreadsheetId, expense);
        }

        const realRowIndex = rowIndex + 1; // 1-based indexing for Sheets API

        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `expenses!A${realRowIndex}:L${realRowIndex}`,
            valueInputOption: 'RAW',
            resource: {
                values: [[
                    expense.id,
                    new Date(expense.date).toISOString(),
                    expense.description,
                    expense.amount,
                    expense.currency,
                    expense.paid_by,
                    expense.category,
                    expense.split_type,
                    JSON.stringify(expense.split_json),
                    expense.notes || '',
                    expense.created_at,
                    expense.tag || ''
                ]]
            }
        });
    },

    async addTag(spreadsheetId: string, tagName: string): Promise<void> {
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'tags!A:A',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[tagName]]
            }
        });
    },

    async addSettlement(spreadsheetId: string, settlement: Settlement): Promise<void> {
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'settlements!A:F',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[
                    settlement.id,
                    settlement.date,
                    settlement.paid_by,
                    settlement.paid_to,
                    settlement.amount,
                    settlement.notes || ''
                ]]
            }
        });
    },

    // Simplistic local recalculation of balances if we don't rely on the 'summary' formula sheet
    calculateBalances(expenses: Expense[], members: Member[], settlements: Settlement[]): BalanceSummary {
        const balances: BalanceSummary = {};
        members.forEach(m => balances[m.name] = 0);

        expenses.forEach(exp => {
            // Payer's balance goes up
            if (balances[exp.paid_by] !== undefined) {
                balances[exp.paid_by] += exp.amount;
            }

            // Calculate shares
            const participants = members.filter(m => {
                if (exp.split_type === 'equal') return true; // simplified: equal among all
                return !!exp.split_json[m.name];
            });

            if (exp.split_type === 'equal') {
                const share = exp.amount / participants.length;
                participants.forEach(p => {
                    if (balances[p.name] !== undefined) balances[p.name] -= share;
                });
            } else if (exp.split_type === 'percentage') {
                Object.entries(exp.split_json).forEach(([name, pct]) => {
                    if (balances[name] !== undefined) {
                        const share = exp.amount * ((pct as number) / 100);
                        balances[name] -= share;
                    }
                });
            } else if (exp.split_type === 'custom') {
                Object.entries(exp.split_json).forEach(([name, amt]) => {
                    if (balances[name] !== undefined) balances[name] -= (amt as number);
                });
            }
        });

        settlements.forEach(settle => {
            if (balances[settle.paid_by] !== undefined) balances[settle.paid_by] += settle.amount;
            if (balances[settle.paid_to] !== undefined) balances[settle.paid_to] -= settle.amount;
        });

        return balances;
    }
};
