import Dexie, { type EntityTable } from 'dexie';
import type { Expense, Settlement } from '../types';

interface QueuedOperation {
    id: string; // internal UUID
    type: 'ADD_EXPENSE' | 'ADD_SETTLEMENT' | 'UPDATE_EXPENSE';
    payload: Expense | Settlement;
    timestamp: string;
    status: 'pending' | 'failed';
    error?: string;
}

const db = new Dexie('SplitLessDB') as Dexie & {
    operationsQueue: EntityTable<QueuedOperation, 'id'>;
    // We can cache expenses here too for faster offline reads, but Zustand might be enough if we just want a PWA store
    cachedExpenses: EntityTable<Expense, 'id'>;
};

db.version(1).stores({
    operationsQueue: 'id, type, status, timestamp',
    cachedExpenses: 'id, date, created_at'
});

export { db };
export type { QueuedOperation };
