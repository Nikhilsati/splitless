import { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { syncEngine } from '../services/sync';
import { formatCurrency, formatDate, getTimestamp } from '../lib/utils';
import { SettleUpModal } from '../components/SettleUpModal';

export function DashboardPage() {
    const { currentUser, groupConfig, expenses, settlements, isOnline, balances } = useStore();
    const [showSettleUp, setShowSettleUp] = useState(false);

    // Fetch on mount or when coming online
    useEffect(() => {
        if (groupConfig?.sheetId && isOnline) {
            syncEngine.fetchRemoteData(groupConfig.sheetId);
        }
    }, [groupConfig, isOnline]);

    // Use calculated balance for the current user
    const netBalance = (currentUser && balances[currentUser]) ? balances[currentUser] : 0;
    const isPositive = netBalance >= 0;

    const categoryEmoji: Record<string, string> = {
        'Food': '🍔',
        'Transport': '🚕',
        'Entertainment': '🍿',
        'Housing': '🏠',
        'Utilities': '💡',
        'Other': '🛒'
    };

    const getEmoji = (category?: string) => categoryEmoji[category || ''] || '🛒';

    // Unified list for timeline
    const allActivities = useMemo(() => {
        const combined = [
            ...expenses.map(e => ({ ...e, type: 'expense' as const })),
            ...settlements.map(s => ({ ...s, type: 'settlement' as const }))
        ];
        return combined.sort((a, b) => {
            const timeA = getTimestamp(a.date);
            const timeB = getTimestamp(b.date);
            if (timeA !== timeB) return timeB - timeA;
            // Tie-breaker: use created_at for expenses if available
            const createA = (a as any).created_at ? getTimestamp((a as any).created_at) : timeA;
            const createB = (b as any).created_at ? getTimestamp((b as any).created_at) : timeB;
            return createB - createA;
        });
    }, [expenses, settlements]);

    return (
        <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex justify-between items-center px-2">
                <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                        {groupConfig?.name || 'SplitLess'}
                    </h2>
                    <p className="text-sm text-textMuted">Welcome back, {currentUser}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-positive' : 'bg-negative/50'}`} />
                </div>
            </header>

            {/* Main Balance Card */}
            <div className="glass rounded-[28px] p-6 relative overflow-hidden group border border-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10 relative">
                    <div className="space-y-1">
                        <p className="text-textMuted font-medium text-xs uppercase tracking-wider">Total Balance</p>
                        <div className="flex items-baseline space-x-1.5">
                            <span className="text-3xl font-light text-white/50">₹</span>
                            <h1 className={`text-5xl font-bold tracking-tight ${isPositive ? 'text-positive' : 'text-negative'}`}>
                                {formatCurrency(Math.abs(netBalance))}
                            </h1>
                        </div>
                        <p className="text-sm text-white/70 font-medium">
                            {isPositive ? 'You are owed' : 'You owe'}
                        </p>
                    </div>

                    {Math.abs(netBalance) > 0 && (
                        <button
                            onClick={() => setShowSettleUp(true)}
                            className="bg-white/10 hover:bg-white/15 border border-white/10 px-6 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-black/20"
                        >
                            Settle Up
                        </button>
                    )}
                </div>
            </div>

            {/* Recent Activity Mini-list */}
            <div className="px-2">
                <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wider mb-4">Recent Activity</h3>
                <div className="space-y-3">
                    {allActivities.slice(0, 5).map(activity => (
                        <div key={activity.id} className="glass rounded-2xl p-4 flex items-center justify-between relative overflow-hidden transition-all active:scale-[0.98]">
                            {activity.isUnsynced && (
                                <div className="absolute top-0 right-0">
                                    <span className="text-[7px] px-1.5 py-0.5 bg-accent text-white font-black uppercase tracking-widest rounded-bl-lg">
                                        Pending
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center space-x-4 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg shrink-0">
                                    {activity.type === 'settlement' ? '🤝' : getEmoji(activity.category)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-white/90 truncate">
                                        {activity.type === 'settlement' ? 'Settlement' : (activity as any).description}
                                    </p>
                                    <p className="text-[11px] text-textMuted mt-0.5 flex items-center">
                                        {activity.type === 'settlement' ? (
                                            <span>{activity.paid_by} paid {(activity as any).paid_to}</span>
                                        ) : (
                                            <span>{(activity as any).paid_by} paid</span>
                                        )}
                                        <span className="mx-1.5 opacity-30">•</span>
                                        <span>{formatDate(activity.date)}</span>
                                        {activity.type === 'expense' && (activity as any).tag && (activity as any).tag !== (activity as any).category && (
                                            <>
                                                <span className="mx-1.5 opacity-30">•</span>
                                                <span className="text-accent font-semibold px-1.5 py-0.5 bg-accent/10 rounded-md text-[9px] uppercase tracking-wider">{(activity as any).tag}</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <p className="font-bold text-white/90 ml-4">₹{formatCurrency(activity.amount)}</p>
                        </div>
                    ))}
                    {allActivities.length === 0 && (
                        <div className="text-center py-10 text-white/40 text-sm">
                            No activity yet. Tap + to add one.
                        </div>
                    )}
                </div>
            </div>
            {showSettleUp && (
                <SettleUpModal onClose={() => setShowSettleUp(false)} />
            )}
        </div>
    );
}
