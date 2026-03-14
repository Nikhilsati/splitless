import { Receipt, Home, Settings, RefreshCw, Users } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { ToastContainer } from './Toast';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: 'home' | 'expenses' | 'members' | 'settings';
    onTabChange: (tab: 'home' | 'expenses' | 'members' | 'settings') => void;
    onAddExpense: () => void;
}

export function Layout({ children, activeTab, onTabChange, onAddExpense }: LayoutProps) {
    const { isSyncing } = useStore();
    const showFab = activeTab === 'home' || activeTab === 'expenses' || activeTab === 'members';

    return (
        <div className="flex flex-col min-h-screen max-w-2xl mx-auto w-full relative pb-20">
            {isSyncing && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] glass border border-accent/20 px-4 py-2 rounded-full flex items-center space-x-2 animate-in slide-in-from-top-4 fade-in duration-300 shadow-lg shadow-black/20">
                    <RefreshCw size={14} className="text-accent animate-spin" />
                    <span className="text-[11px] font-bold text-accent tracking-widest uppercase">Syncing</span>
                </div>
            )}
            <main className="flex-1 px-3 sm:px-4 py-4 pb-24">
                {children}
            </main>

            {showFab && (
                <button
                    onClick={onAddExpense}
                    className="fixed bottom-24 right-4 sm:right-6 w-14 h-14 bg-accent text-white rounded-[20px] shadow-lg shadow-accent/20 flex items-center justify-center hover:bg-accent/90 active:scale-95 transition-all z-40"
                >
                    <Receipt size={24} />
                    <div className="absolute top-3 right-3 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                        <span className="text-accent text-[10px] font-bold leading-none -mt-0.5">+</span>
                    </div>
                </button>
            )}

            <nav className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto glass rounded-t-2xl z-40 border-b-0 border-l-0 border-r-0 pb-safe">
                <div className="flex justify-around items-center h-16 sm:h-18 px-1 sm:px-2">
                    <button
                        onClick={() => onTabChange('home')}
                        className={cn("flex flex-col items-center justify-center w-full h-full space-y-0.5 sm:space-y-1", activeTab === 'home' ? "text-accent" : "text-textMuted")}
                    >
                        <Home size={20} className="sm:w-[22px] sm:h-[22px]" />
                        <span className="text-[9px] sm:text-[10px] font-medium tracking-tight">Home</span>
                    </button>

                    <button
                        onClick={() => onTabChange('expenses')}
                        className={cn("flex flex-col items-center justify-center w-full h-full space-y-0.5 sm:space-y-1", activeTab === 'expenses' ? "text-accent" : "text-textMuted")}
                    >
                        <Receipt size={20} className="sm:w-[22px] sm:h-[22px]" />
                        <span className="text-[9px] sm:text-[10px] font-medium tracking-tight">Expenses</span>
                    </button>

                    <button
                        onClick={() => onTabChange('members')}
                        className={cn("flex flex-col items-center justify-center w-full h-full space-y-0.5 sm:space-y-1", activeTab === 'members' ? "text-accent" : "text-textMuted")}
                    >
                        <Users size={20} className="sm:w-[22px] sm:h-[22px]" />
                        <span className="text-[9px] sm:text-[10px] font-medium tracking-tight">Members</span>
                    </button>

                    <button
                        onClick={() => onTabChange('settings')}
                        className={cn("flex flex-col items-center justify-center w-full h-full space-y-0.5 sm:space-y-1", activeTab === 'settings' ? "text-accent" : "text-textMuted")}
                    >
                        <Settings size={20} className="sm:w-[22px] sm:h-[22px]" />
                        <span className="text-[9px] sm:text-[10px] font-medium tracking-tight">Settings</span>
                    </button>
                </div>
            </nav>
            <ToastContainer />
        </div>
    );
}
