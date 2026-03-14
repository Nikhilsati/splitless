import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Expense, Member, Settlement, BalanceSummary, GroupConfig, Toast } from '../types';

interface AppState {
    // Config state
    currentUser: string | null;
    groupConfig: GroupConfig | null;
    accessToken: string | null;
    tokenExpiresAt: number | null;

    // Data state
    expenses: Expense[];
    members: Member[];
    settlements: Settlement[];
    balances: BalanceSummary;
    tags: string[];

    // App UI State
    activeTab: 'home' | 'expenses' | 'members' | 'settings';
    isOnline: boolean;
    isSyncing: boolean;
    toasts: Toast[];
    editingExpense: Expense | null;

    // Actions
    setActiveTab: (tab: 'home' | 'expenses' | 'members' | 'settings') => void;
    setCurrentUser: (name: string | null) => void;
    setGroupConfig: (config: GroupConfig | null) => void;
    setAuthToken: (token: string | null, expiresAt: number | null) => void;
    setExpenses: (expenses: Expense[]) => void;
    setMembers: (members: Member[]) => void;
    setSettlements: (settlements: Settlement[]) => void;
    setBalances: (balances: BalanceSummary) => void;
    setTags: (tags: string[]) => void;
    setIsOnline: (status: boolean) => void;
    setIsSyncing: (status: boolean) => void;
    addToast: (message: string, type: Toast['type'], action?: Toast['action']) => void;
    removeToast: (id: string) => void;
    setEditingExpense: (expense: Expense | null) => void;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            currentUser: null,
            groupConfig: null,
            accessToken: null,
            tokenExpiresAt: null,
            expenses: [],
            members: [],
            settlements: [],
            balances: {},
            tags: [],
            activeTab: 'home',
            isOnline: navigator.onLine,
            isSyncing: false,
            toasts: [],
            editingExpense: null,

            setActiveTab: (tab) => set({ activeTab: tab }),

            setCurrentUser: (name: string | null) => set({ currentUser: name }),
            setGroupConfig: (config: GroupConfig | null) => set({ groupConfig: config }),
            setAuthToken: (token: string | null, expiresAt: number | null) => set({ accessToken: token, tokenExpiresAt: expiresAt }),
            setExpenses: (expenses: Expense[]) => set({ expenses }),
            setMembers: (members: Member[]) => set({ members }),
            setSettlements: (settlements: Settlement[]) => set({ settlements }),
            setBalances: (balances: BalanceSummary) => set({ balances }),
            setTags: (tags: string[]) => set({ tags }),
            setIsOnline: (status: boolean) => set({ isOnline: status }),
            setIsSyncing: (status: boolean) => set({ isSyncing: status }),
            addToast: (message: string, type: Toast['type'], action?: Toast['action']) => {
                const id = Math.random().toString(36).substring(2, 9);
                set((state: AppState) => ({ toasts: [...state.toasts, { id, message, type, action }] }));
                setTimeout(() => {
                    set((state: AppState) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
                }, 4000);
            },
            removeToast: (id: string) => set((state: AppState) => ({ toasts: state.toasts.filter(t => t.id !== id) })),
            setEditingExpense: (expense: Expense | null) => set({ editingExpense: expense }),
        }),
        {
            name: 'splitless-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state: AppState) => ({
                currentUser: state.currentUser,
                groupConfig: state.groupConfig,
                accessToken: state.accessToken,
                tokenExpiresAt: state.tokenExpiresAt,
                tags: state.tags
            }), // Only persist identity, config and tags
        }
    )
);

// Listen to online/offline events
window.addEventListener('online', () => useStore.getState().setIsOnline(true));
window.addEventListener('offline', () => useStore.getState().setIsOnline(false));
