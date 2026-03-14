import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, getTimestamp, cn } from '../lib/utils';

export function ExpensesPage() {
    const { expenses, settlements, currentUser, setEditingExpense } = useStore();
    const [filter, setFilter] = useState('all');

    // Unified list for timeline
    const allActivities = useMemo(() => {
        let combined = [
            ...expenses.map(e => ({ ...e, type: 'expense' as const })),
            ...settlements.map(s => ({ ...s, type: 'settlement' as const }))
        ];

        if (filter === 'you' && currentUser) {
            combined = combined.filter(act =>
                act.paid_by === currentUser ||
                (act.type === 'expense' && act.split_json[currentUser] !== undefined) ||
                (act.type === 'settlement' && act.paid_to === currentUser)
            );
        }

        return combined.sort((a, b) => {
            const timeA = getTimestamp(a.date);
            const timeB = getTimestamp(b.date);
            if (timeA !== timeB) return timeB - timeA;
            // Tie-breaker
            const createA = (a as any).created_at ? getTimestamp((a as any).created_at) : timeA;
            const createB = (b as any).created_at ? getTimestamp((b as any).created_at) : timeB;
            return createB - createA;
        });
    }, [expenses, settlements, filter, currentUser]);

    return (
        <div className="space-y-6 pt-4 animate-in fade-in duration-500">
            <header className="px-2 flex justify-between items-center">
                <h2 className="text-2xl font-bold">Expenses</h2>

                {/* Simple pill filter */}
                <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                    {['all', 'you'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${filter === f ? 'bg-white/15 text-white' : 'text-textMuted hover:text-white/70'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </header>

            <div className="space-y-3 px-2 pb-24">
                {allActivities.map(activity => (
                    <div
                        key={activity.id}
                        onClick={() => {
                            if (activity.type === 'expense') {
                                setEditingExpense(activity as any);
                            }
                        }}
                        className={cn(
                            "glass rounded-2xl p-4 flex items-center justify-between group active:scale-[0.98] transition-all relative overflow-hidden",
                            activity.type === 'settlement' 
                                ? "border-dashed border-accent/30 bg-accent/[0.02] cursor-default" 
                                : "cursor-pointer"
                        )}
                    >
                        {activity.isUnsynced && (
                            <div className="absolute top-0 right-0">
                                <span className="text-[8px] px-2 py-0.5 bg-accent text-white font-black uppercase tracking-[0.1em] rounded-bl-lg shadow-sm">
                                    Pending Sync
                                </span>
                            </div>
                        )}
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0 border",
                                activity.type === 'settlement'
                                    ? "bg-accent/10 border-accent/20"
                                    : "bg-gradient-to-br from-white/10 to-transparent border-white/5"
                            )}>
                                {activity.type === 'settlement' ? '🤝' : (
                                    activity.category === 'Food' ? '🍽️' : activity.category === 'Travel' ? '🚗' : '💸'
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={cn(
                                    "font-bold tracking-tight truncate",
                                    activity.type === 'settlement' ? "text-accent" : "text-white"
                                )}>
                                    {activity.type === 'settlement' ? 'Settlement' : (activity as any).description}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                    <span className="text-[11px] text-textMuted font-medium whitespace-normal">
                                        {activity.type === 'settlement' 
                                            ? <><span className="text-white">{activity.paid_by}</span> paid <span className="text-white">{(activity as any).paid_to}</span></>
                                            : activity.paid_by
                                        }
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-white/10 shrink-0" />
                                    <span className="text-[11px] text-textMuted/60 shrink-0">{formatDate(activity.date)}</span>
                                    {activity.type === 'expense' && (activity as any).tag && (activity as any).tag !== (activity as any).category && (
                                        <>
                                            <span className="w-1 h-1 rounded-full bg-white/10 shrink-0" />
                                            <span className="text-accent font-bold px-1.5 py-0.5 bg-accent/10 rounded-md text-[9px] uppercase tracking-wider shrink-0 break-all">{activity.tag}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-right pl-4 shrink-0">
                            <p className={cn(
                                "font-bold text-lg",
                                activity.type === 'settlement' ? "text-accent" : "text-white"
                            )}>
                                ₹{formatCurrency(activity.amount)}
                            </p>
                            <p className="text-[9px] text-textMuted font-bold uppercase tracking-wider opacity-60">
                                {activity.type === 'settlement' ? 'settlement' : (activity as any).split_type}
                            </p>
                        </div>
                    </div>
                ))}
                {allActivities.length === 0 && (
                    <div className="h-40 flex items-center justify-center text-textMuted italic text-sm">
                        All caught up. No expenses yet.
                    </div>
                )}
            </div>
        </div>
    );
}
