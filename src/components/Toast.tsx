import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import type { Toast as ToastType } from '../types';

export function ToastContainer() {
    const { toasts, removeToast } = useStore();

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col space-y-2 pointer-events-none w-full max-w-[90vw]">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

function Toast({ toast, onRemove }: { toast: ToastType; onRemove: () => void }) {
    const icons = {
        success: <CheckCircle size={18} className="text-positive" />,
        error: <AlertCircle size={18} className="text-negative" />,
        info: <Info size={18} className="text-accent" />,
    };

    return (
        <div className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-2xl glass border border-white/10 shadow-lg animate-in slide-in-from-bottom-4 pointer-events-auto",
            toast.type === 'error' ? "border-negative/20" : "border-white/10"
        )}>
            {icons[toast.type]}
            <p className="text-sm font-medium text-white/90 flex-1">{toast.message}</p>
            {toast.action && (
                <button
                    onClick={() => {
                        toast.action?.onClick();
                        onRemove();
                    }}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs font-semibold text-accent transition-colors"
                >
                    {toast.action.label}
                </button>
            )}
            <button onClick={onRemove} className="p-1 text-white/50 hover:text-white">
                <X size={16} />
            </button>
        </div>
    );
}
