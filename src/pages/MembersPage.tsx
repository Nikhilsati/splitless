import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../lib/utils';
import { User } from 'lucide-react';

export function MembersPage() {
    const { members, balances } = useStore();

    return (
        <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="px-2">
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                    Group Members
                </h2>
                <p className="text-sm text-textMuted">View everyone's current standing</p>
            </header>

            <div className="space-y-3 px-2">
                {members.map((member) => {
                    const balance = balances[member.name] || 0;
                    const isPositive = balance >= 0;

                    return (
                        <div
                            key={member.name}
                            className="glass rounded-2xl p-4 flex items-center justify-between relative overflow-hidden transition-all active:scale-[0.98] border border-white/5"
                        >
                            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 flex items-center justify-center text-base sm:text-lg shrink-0 text-white/50">
                                    <User size={18} className="sm:w-[20px] sm:h-[20px]" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-white/90 truncate">{member.name}</p>
                                    <p className="text-[11px] text-textMuted mt-0.5">
                                        Joined {formatDate(member.joined_at)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right ml-3 sm:ml-4">
                                <p className={`font-bold text-sm sm:text-base ${isPositive ? 'text-positive' : 'text-negative'}`}>
                                    ₹{formatCurrency(balance)}
                                </p>
                                <p className="text-[9px] sm:text-[10px] text-textMuted font-medium uppercase tracking-wider">
                                    {isPositive ? 'is owed' : 'owes'}
                                </p>
                            </div>
                        </div>
                    );
                })}
                {members.length === 0 && (
                    <div className="text-center py-10 text-white/40 text-sm">
                        No members found.
                    </div>
                )}
            </div>
        </div>
    );
}
