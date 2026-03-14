import { useStore } from '../store/useStore';
import { db } from './db';
import { sheetsService } from './sheets';
import type { Expense, Settlement } from '../types';

export const syncEngine = {
    _migrationChecked: false,

    async processQueue() {
        const store = useStore.getState();
        const config = store.groupConfig;

        if (!store.isOnline || !config?.sheetId || !sheetsService.isSignedIn()) {
            return;
        }

        const { sheetId } = config;
        let successCount = 0;
        let failCount = 0;

        try {
            store.setIsSyncing(true);
            const pendingOps = await db.operationsQueue.where('status').equals('pending').sortBy('timestamp');

            if (pendingOps.length === 0) return;

            for (const op of pendingOps) {
                try {
                    if (op.type === 'ADD_EXPENSE') {
                        await sheetsService.addExpense(sheetId, op.payload as Expense);
                    } else if (op.type === 'UPDATE_EXPENSE') {
                        await sheetsService.updateExpense(sheetId, op.payload as Expense);
                    } else if (op.type === 'ADD_SETTLEMENT') {
                        await sheetsService.addSettlement(sheetId, op.payload as Settlement);
                    }
                    await db.operationsQueue.delete(op.id);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to process operation ${op.id}`, error);
                    failCount++;
                    const message = error instanceof Error ? error.message : String(error);
                    const isAuthError = message.toLowerCase().includes('auth') || message.toLowerCase().includes('unauthorized') || !sheetsService.isSignedIn();

                    if (isAuthError) {
                        store.addToast("Authentication required", "error", {
                            label: "Settings",
                            onClick: () => store.setActiveTab('settings')
                        });
                    } else {
                        store.addToast(`Sync failed: ${message}`, 'error');
                    }

                    await db.operationsQueue.update(op.id, {
                        status: 'failed',
                        error: message
                    });
                }
            }

            if (successCount > 0) {
                store.addToast(`Successfully synced ${successCount} item(s)`, 'success');
            }

            // After sync, refetch remote data to update the UI with truth
            await syncEngine.fetchRemoteData(sheetId);
        } finally {
            store.setIsSyncing(false);
        }
    },

    async fetchRemoteData(sheetId: string) {
        try {
            // Run migration check once per session to handle backward compatibility
            if (!this._migrationChecked) {
                await sheetsService.setupInitialSheet(sheetId);
                this._migrationChecked = true;
            }

            const expenses = await sheetsService.getExpenses(sheetId);
            const members = await sheetsService.getMembers(sheetId);
            const settlements = await sheetsService.getSettlements(sheetId);
            const tags = await sheetsService.getTags(sheetId);

            // Get pending operations to merge with remote data
            const pendingOps = await db.operationsQueue.where('status').equals('pending').toArray();

            const pendingExpenses = pendingOps
                .filter(op => op.type === 'ADD_EXPENSE' || op.type === 'UPDATE_EXPENSE')
                .map(op => ({ ...(op.payload as Expense), isUnsynced: true }));

            const pendingSettlements = pendingOps
                .filter(op => op.type === 'ADD_SETTLEMENT')
                .map(op => ({ ...(op.payload as Settlement), isUnsynced: true }));

            const store = useStore.getState();
            store.setExpenses([...pendingExpenses, ...expenses]);
            store.setMembers(members);
            store.setSettlements([...pendingSettlements, ...settlements]);
            store.setTags(tags);

            const balances = sheetsService.calculateBalances(
                [...pendingExpenses, ...expenses],
                members,
                [...pendingSettlements, ...settlements]
            );
            store.setBalances(balances);
        } catch (error) {
            console.error("Failed to fetch remote data", error);
            const store = useStore.getState();
            const message = error instanceof Error ? error.message : String(error);
            const isAuthError = message.toLowerCase().includes('auth') || message.toLowerCase().includes('unauthorized') || !sheetsService.isSignedIn();

            if (isAuthError) {
                store.addToast("Authentication required", "error", {
                    label: "Settings",
                    onClick: () => store.setActiveTab('settings')
                });
            } else {
                store.addToast("Failed to fetch data from Sheets", "error");
            }
        }
    },

    async queueExpense(expense: Expense) {
        const store = useStore.getState();
        const isOnline = store.isOnline;

        // Optimistic update locally
        const newExpenses = [expense, ...store.expenses.filter(e => e.id !== expense.id)];
        store.setExpenses(newExpenses);
        store.setBalances(sheetsService.calculateBalances(newExpenses, store.members, store.settlements));

        if (isOnline && store.groupConfig?.sheetId && sheetsService.isSignedIn()) {
            try {
                await sheetsService.addExpense(store.groupConfig.sheetId, expense);
            } catch (err) {
                // Fallback to queue
                await db.operationsQueue.add({
                    id: expense.id,
                    type: 'ADD_EXPENSE',
                    payload: expense,
                    timestamp: new Date().toISOString(),
                    status: 'pending'
                });
            }
        } else {
            await db.operationsQueue.add({
                id: expense.id,
                type: 'ADD_EXPENSE',
                payload: expense,
                timestamp: new Date().toISOString(),
                status: 'pending'
            });
        }
    },

    async queueUpdateExpense(expense: Expense) {
        const store = useStore.getState();
        const isOnline = store.isOnline;

        // Optimistic update locally
        const newExpenses = store.expenses.map(e => e.id === expense.id ? expense : e);
        store.setExpenses(newExpenses);
        store.setBalances(sheetsService.calculateBalances(newExpenses, store.members, store.settlements));

        if (isOnline && store.groupConfig?.sheetId && sheetsService.isSignedIn()) {
            try {
                await sheetsService.updateExpense(store.groupConfig.sheetId, expense);
            } catch (err) {
                // Fallback to queue
                // If there's already a pending operation for this ID, update it
                const existing = await db.operationsQueue.get(expense.id);
                if (existing) {
                    await db.operationsQueue.update(expense.id, {
                        payload: expense,
                        timestamp: new Date().toISOString(),
                        status: 'pending'
                    });
                } else {
                    await db.operationsQueue.add({
                        id: expense.id,
                        type: 'UPDATE_EXPENSE',
                        payload: expense,
                        timestamp: new Date().toISOString(),
                        status: 'pending'
                    });
                }
            }
        } else {
            const existing = await db.operationsQueue.get(expense.id);
            if (existing) {
                await db.operationsQueue.update(expense.id, {
                    payload: expense,
                    timestamp: new Date().toISOString(),
                    status: 'pending'
                });
            } else {
                await db.operationsQueue.add({
                    id: expense.id,
                    type: 'UPDATE_EXPENSE',
                    payload: expense,
                    timestamp: new Date().toISOString(),
                    status: 'pending'
                });
            }
        }
    },

    async queueSettlement(settlement: Settlement) {
        const store = useStore.getState();
        const isOnline = store.isOnline;

        // Optimistic update locally
        const newSettlements = [settlement, ...store.settlements];
        store.setSettlements(newSettlements);
        store.setBalances(sheetsService.calculateBalances(store.expenses, store.members, newSettlements));

        if (isOnline && store.groupConfig?.sheetId && sheetsService.isSignedIn()) {
            try {
                await sheetsService.addSettlement(store.groupConfig.sheetId, settlement);
            } catch (err) {
                // Fallback to queue
                await db.operationsQueue.add({
                    id: settlement.id,
                    type: 'ADD_SETTLEMENT',
                    payload: settlement,
                    timestamp: new Date().toISOString(),
                    status: 'pending'
                });
            }
        } else {
            await db.operationsQueue.add({
                id: settlement.id,
                type: 'ADD_SETTLEMENT',
                payload: settlement,
                timestamp: new Date().toISOString(),
                status: 'pending'
            });
        }
    }
};

window.addEventListener('online', () => {
    syncEngine.processQueue();
});
