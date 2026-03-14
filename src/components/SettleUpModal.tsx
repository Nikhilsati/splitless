import { useState, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { syncEngine } from '../services/sync';
import { generateId, formatCurrency } from '../lib/utils';
import type { Settlement } from '../types';

interface SettleUpModalProps {
    onClose: () => void;
}

export function SettleUpModal({ onClose }: SettleUpModalProps) {
    const { currentUser, members } = useStore();

    const [amountInput, setAmountInput] = useState('');
    const [paidBy, setPaidBy] = useState(currentUser || '');
    const [paidTo, setPaidTo] = useState('');

    const { expenses, settlements } = useStore();

    // Calculate P2P balance when members are selected
    useEffect(() => {
        if (!paidBy || !paidTo) return;

        let balance = 0;

        // Add expenses where paidBy paid and paidTo was a participant
        expenses.forEach(exp => {
            if (exp.paid_by === paidBy) {
                if (exp.split_type === 'equal') {
                    // Assuming equal among all members as per sheetsService.calculateBalances
                    balance += exp.amount / members.length;
                } else if (exp.split_json[paidTo]) {
                    if (exp.split_type === 'percentage') {
                        balance += exp.amount * (exp.split_json[paidTo] / 100);
                    } else if (exp.split_type === 'custom') {
                        balance += exp.split_json[paidTo];
                    }
                }
            }

            // Subtract expenses where paidTo paid and paidBy was a participant
            if (exp.paid_by === paidTo) {
                if (exp.split_type === 'equal') {
                    balance -= exp.amount / members.length;
                } else if (exp.split_json[paidBy]) {
                    if (exp.split_type === 'percentage') {
                        balance -= exp.amount * (exp.split_json[paidBy] / 100);
                    } else if (exp.split_type === 'custom') {
                        balance -= exp.split_json[paidBy];
                    }
                }
            }
        });

        // Add settlements
        settlements.forEach(s => {
            if (s.paid_by === paidBy && s.paid_to === paidTo) balance -= s.amount;
            if (s.paid_by === paidTo && s.paid_to === paidBy) balance += s.amount;
        });

        // If paidBy owes money to paidTo (balance < 0), prefill with absolute value
        if (balance < 0) {
            setAmountInput(Math.abs(balance).toString());
        } else {
            setAmountInput('');
        }
    }, [paidBy, paidTo, expenses, settlements, members.length]);

    const amount = parseFloat(amountInput) || 0;

    const validationError = useMemo(() => {
        if (amount <= 0) return 'Amount must be greater than 0';
        if (!paidBy) return 'Please select who is paying';
        if (!paidTo) return 'Please select who is receiving';
        if (paidBy === paidTo) return 'Sender and receiver must be different';
        return null;
    }, [amount, paidBy, paidTo]);

    const handleSave = async () => {
        if (validationError) return;

        const settlement: Settlement = {
            id: generateId(),
            date: new Date().toISOString(), // Use ISO string
            paid_by: paidBy,
            paid_to: paidTo,
            amount,
            notes: 'Settled up'
        };

        // Queue settlement logic
        await syncEngine.queueSettlement(settlement);

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-bgDark/80 backdrop-blur-xl flex flex-col justify-center p-4 animate-in fade-in duration-300">
            <div className="glass rounded-[28px] overflow-hidden max-w-sm w-full mx-auto relative snap-y">
                <header className="flex justify-between items-center p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold">Settle Up</h2>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white/10 text-white/70">
                        <X size={20} />
                    </button>
                </header>

                <div className="p-6 space-y-6">
                    <div className="flex flex-col items-center justify-center space-y-2 py-4">
                        <div className="flex items-center space-x-2 text-4xl sm:text-5xl font-light">
                            <span className="text-white/40">₹</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={amountInput}
                                onChange={e => setAmountInput(e.target.value)}
                                className="w-48 bg-transparent border-0 focus:ring-0 outline-none text-center"
                                autoFocus
                            />
                        </div>
                        {amount > 0 && (
                            <div className="text-sm font-medium text-accent">
                                ₹{formatCurrency(amount)}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-textMuted w-16">To</span>
                            <select
                                value={paidTo}
                                onChange={e => setPaidTo(e.target.value)}
                                className="bg-transparent text-white font-semibold outline-none flex-1 text-right"
                            >
                                <option value="" disabled className="text-black">Select...</option>
                                {members.map(m => (
                                    <option key={m.name} value={m.name} className="text-black">{m.name} {m.name === currentUser ? '(You)' : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-center -my-2 py-2">
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 text-accent">
                                ↑
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-textMuted w-16">From</span>
                            <select
                                value={paidBy}
                                onChange={e => setPaidBy(e.target.value)}
                                className="bg-transparent text-white font-semibold outline-none flex-1 text-right"
                            >
                                <option value="" disabled className="text-black">Select...</option>
                                {members.map(m => (
                                    <option key={m.name} value={m.name} className="text-black">{m.name} {m.name === currentUser ? '(You)' : ''}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {validationError && (
                        <p className="text-negative text-sm text-center font-medium">{validationError}</p>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={!!validationError}
                        className="w-full bg-positive text-black font-bold py-3 sm:py-4 rounded-2xl hover:bg-positive/90 active:scale-95 transition-all disabled:opacity-50 flex justify-center uppercase tracking-wide text-sm"
                    >
                        Confirm Settlement
                    </button>
                </div>
            </div>
        </div>
    );
}
