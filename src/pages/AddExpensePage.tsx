import { useState, useMemo } from 'react';
import { X, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { syncEngine } from '../services/sync';
import { sheetsService } from '../services/sheets';
import { generateId, cn } from '../lib/utils';
import { Tag as TagIcon, Plus } from 'lucide-react';
import type { SplitType, Expense } from '../types';

interface AddExpenseProps {
    onClose: () => void;
    initialExpense?: Expense | null;
}

export function AddExpenseScreen({ onClose, initialExpense }: AddExpenseProps) {
    const { currentUser, members, tags, setTags, groupConfig } = useStore();

    const [description, setDescription] = useState(initialExpense?.description || '');
    const [amountInput, setAmountInput] = useState(initialExpense?.amount.toString() || '');
    const [paidBy, setPaidBy] = useState(initialExpense?.paid_by || currentUser || '');
    const [category, setCategory] = useState(initialExpense?.category || 'Food');
    const [selectedTag, setSelectedTag] = useState(initialExpense?.tag && initialExpense.tag !== initialExpense.category ? initialExpense.tag : '');
    const [isCreatingTag, setIsCreatingTag] = useState(false);
    const [newTagInput, setNewTagInput] = useState('');
    const [splitType, setSplitType] = useState<SplitType>(initialExpense?.split_type || 'equal');
    const [date, setDate] = useState(initialExpense?.date ? new Date(initialExpense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

    // States for 'percentage' and 'custom' splits
    // key: member name, value: number (percentage 0-100 or amount)
    const [splitValues, setSplitValues] = useState<Record<string, string>>(
        members.reduce((acc, m) => {
            const val = initialExpense?.split_json[m.name];
            return { ...acc, [m.name]: val ? val.toString() : '' };
        }, {})
    );

    const amount = parseFloat(amountInput) || 0;

    // Split type toggles logic
    const handleSplitValueChange = (member: string, val: string) => {
        setSplitValues(prev => ({ ...prev, [member]: val }));
    };

    const validationError = useMemo(() => {
        if (!description.trim()) return 'Description is required';
        if (amount <= 0) return 'Amount must be greater than 0';
        if (!paidBy) return 'Please select who paid';

        if (splitType === 'percentage') {
            const sum = Object.values(splitValues).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
            if (Math.abs(sum - 100) > 0.01) return `Percentages must add to 100% (currently ${sum.toFixed(1)}%)`;
        }

        if (splitType === 'custom') {
            const sum = Object.values(splitValues).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
            if (Math.abs(sum - amount) > 0.01) return `Custom amounts must add to ${amount} (currently ${sum.toFixed(2)})`;
        }

        return null;
    }, [description, amount, paidBy, splitType, splitValues]);

    const handleSave = async () => {
        if (validationError) return;

        // Build split_json
        const split_json: Record<string, number> = {};
        if (splitType === 'percentage' || splitType === 'custom') {
            Object.entries(splitValues).forEach(([m, val]) => {
                const num = parseFloat(val);
                if (num > 0) split_json[m] = num;
            });
        }

        let finalTag = selectedTag;
        if (newTagInput.trim()) {
            finalTag = newTagInput.trim();
            if (groupConfig?.sheetId) {
                // Background add tag to sheets
                sheetsService.addTag(groupConfig.sheetId, finalTag);
                // Update local store immediately for better UX
                if (!tags.includes(finalTag)) {
                    setTags([...tags, finalTag]);
                }
            }
        }

        const expense: Expense = {
            id: initialExpense?.id || generateId(),
            date: new Date(date).toISOString(), // Use ISO string
            description: description.trim(),
            amount,
            currency: 'INR',
            paid_by: paidBy,
            category,
            tag: finalTag || category, // Default to category if no tag
            split_type: splitType,
            split_json,
            created_at: initialExpense?.created_at || new Date().toISOString()
        };

        if (initialExpense) {
            await syncEngine.queueUpdateExpense(expense);
        } else {
            await syncEngine.queueExpense(expense);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-bgDark/80 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Header */}
            <header className="flex justify-between items-center p-4 border-b border-white/10">
                <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/70">
                    <X size={24} />
                </button>
                <h2 className="text-lg font-bold">{initialExpense ? 'Edit Expense' : 'Add Expense'}</h2>
                <button
                    onClick={handleSave}
                    disabled={!!validationError}
                    className="p-2 -mr-2 rounded-full text-accent hover:bg-accent/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                    <Check size={24} />
                </button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
                {/* Core Inputs */}
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Description (e.g. Dinner)"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full text-xl sm:text-2xl font-bold bg-transparent border-0 border-b border-white/20 pb-2 focus:ring-0 focus:border-accent outline-none placeholder-white/30"
                        autoFocus
                    />

                    <div className="flex items-center space-x-2 text-3xl sm:text-4xl font-light">
                        <span className="text-white/40">₹</span>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={amountInput}
                            onChange={e => setAmountInput(e.target.value)}
                            className="w-full bg-transparent border-0 border-b border-white/20 pb-2 focus:ring-0 focus:border-accent outline-none placeholder-white/20"
                        />
                    </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass rounded-xl p-3">
                        <label className="text-[10px] uppercase tracking-wider text-textMuted font-semibold">Paid By</label>
                        <select
                            value={paidBy}
                            onChange={e => setPaidBy(e.target.value)}
                            className="w-full bg-transparent text-white font-medium outline-none mt-1"
                        >
                            <option value="" disabled className="text-black">Select...</option>
                            {members.map(m => (
                                <option key={m.name} value={m.name} className="text-black">{m.name} {m.name === currentUser ? '(You)' : ''}</option>
                            ))}
                        </select>
                    </div>

                    <div className="glass rounded-xl p-3">
                        <label className="text-[10px] uppercase tracking-wider text-textMuted font-semibold">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full bg-transparent text-white font-medium outline-none mt-1"
                        />
                    </div>
                </div>

                {/* Tags Section */}
                <div className="space-y-3">
                    <div className="flex items-center space-x-2 px-1">
                        <TagIcon size={12} className="text-accent" />
                        <label className="text-[10px] uppercase tracking-wider text-textMuted font-bold">Tag / Category</label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {/* Standard Categories as initial tags */}
                        {['Food', 'Travel', 'Shopping', 'Home', 'Bills', 'Other'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => {
                                    setCategory(cat);
                                    setSelectedTag('');
                                    setNewTagInput('');
                                }}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                                    (category === cat && !selectedTag && !newTagInput)
                                        ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
                                        : "bg-white/5 text-white/60 border-white/10 hover:border-white/20"
                                )}
                            >
                                {cat}
                            </button>
                        ))}

                        {/* Custom Tags from Store */}
                        {tags.filter(t => !['Food', 'Travel', 'Shopping', 'Home', 'Bills', 'Other'].includes(t)).map(tag => (
                            <button
                                key={tag}
                                onClick={() => {
                                    setSelectedTag(tag);
                                    setNewTagInput('');
                                }}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                                    selectedTag === tag
                                        ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
                                        : "bg-white/5 text-white/60 border-white/10 hover:border-white/20"
                                )}
                            >
                                {tag}
                            </button>
                        ))}

                        {/* Add New Tag Button */}
                        {!isCreatingTag ? (
                            <button
                                onClick={() => setIsCreatingTag(true)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-accent border border-accent/20 flex items-center space-x-1"
                            >
                                <Plus size={12} />
                                <span>New Tag</span>
                            </button>
                        ) : (
                            <div className="flex items-center bg-white/10 rounded-full px-3 py-1 border border-accent/50">
                                <input
                                    type="text"
                                    value={newTagInput}
                                    onChange={e => setNewTagInput(e.target.value)}
                                    placeholder="Tag name..."
                                    className="bg-transparent text-xs font-medium outline-none text-white w-20"
                                    autoFocus
                                    onBlur={() => {
                                        if (!newTagInput.trim()) setIsCreatingTag(false);
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            if (newTagInput.trim()) {
                                                setSelectedTag(''); // Deselect others
                                                setIsCreatingTag(false);
                                            }
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Split Options */}
                <div className="glass rounded-2xl overflow-hidden pt-1">
                    <div className="flex border-b border-white/10 p-1">
                        {['equal', 'percentage', 'custom'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setSplitType(type as SplitType)}
                                className={`flex-1 py-2 text-sm font-medium rounded-xl capitalize transition-all ${splitType === type ? 'bg-white/15 text-white shadow-sm' : 'text-textMuted hover:text-white/70'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 space-y-3">
                        {splitType === 'equal' && (
                            <p className="text-sm text-center text-textMuted py-4">
                                Split equally between {members.length} people (₹{(amount / (members.length || 1)).toFixed(2)} / each)
                            </p>
                        )}

                        {(splitType === 'percentage' || splitType === 'custom') && members.map(m => (
                            <div key={m.name} className="flex items-center justify-between">
                                <span className="font-medium">{m.name}</span>
                                <div className="flex items-center space-x-2 bg-black/20 rounded-lg px-3 py-2 border border-white/5 w-1/3">
                                    {splitType === 'custom' && <span className="text-xs text-white/50">₹</span>}
                                    <input
                                        type="number"
                                        value={splitValues[m.name] || ''}
                                        onChange={(e) => handleSplitValueChange(m.name, e.target.value)}
                                        placeholder="0"
                                        className="bg-transparent w-full outline-none text-right font-mono"
                                    />
                                    {splitType === 'percentage' && <span className="text-xs text-white/50">%</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {validationError && (
                    <div className="text-center text-sm text-negative font-medium py-2">
                        {validationError}
                    </div>
                )}
            </div>
        </div>
    );
}
