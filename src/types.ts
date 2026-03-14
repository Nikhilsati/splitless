export type SplitType = 'equal' | 'percentage' | 'custom';

export interface Expense {
    id: string;
    date: string; // ISO date string
    description: string;
    amount: number;
    currency: string;
    paid_by: string; // member name
    category: string;
    split_type: SplitType;
    split_json: Record<string, number>; // { memberName: value } - for equal it's empty or ignored, for percentage it sums to 100, for custom it sums to amount
    notes?: string;
    created_at: string; // ISO timestamp
    isUnsynced?: boolean;
    tag?: string;
}

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    action?: {
        label: string;
        onClick: () => void;
    };
}

export interface Member {
    name: string;
    joined_at: string;
}

export interface Settlement {
    id: string;
    date: string;
    paid_by: string;
    paid_to: string;
    amount: number;
    notes?: string;
    isUnsynced?: boolean;
    tag?: string;
}

export interface BalanceSummary {
    [memberName: string]: number; // net balance (positive means owed to them, negative means they owe)
}

export interface GroupConfig {
    name: string;
    sheetId: string;
}
