import { useStore } from '../store/useStore';
import { LogOut, RefreshCcw, User, Link as LinkIcon, AlertTriangle, Key } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { sheetsService } from '../services/sheets';
import { syncEngine } from '../services/sync';

export function SettingsPage() {
    const { currentUser, groupConfig, setCurrentUser, setGroupConfig, setAuthToken, tokenExpiresAt } = useStore();

    const isTokenExpired = !tokenExpiresAt || tokenExpiresAt < Date.now();

    const login = useGoogleLogin({
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        onSuccess: (tokenResponse) => {
            setAuthToken(tokenResponse.access_token, Date.now() + tokenResponse.expires_in * 1000);
            sheetsService.setToken(tokenResponse.access_token);
            syncEngine.processQueue();
        },
    });

    const handleLogout = () => {
        if (confirm('Are you sure you want to log out? Local pending data will be cleared if not synced.')) {
            setCurrentUser(null);
            setGroupConfig(null);
            setAuthToken(null, null);
        }
    };

    return (
        <div className="space-y-6 pt-4 animate-in fade-in duration-500">
            <header className="px-2">
                <h2 className="text-xl sm:text-2xl font-bold">Settings</h2>
            </header>

            <div className="space-y-4 px-2">

                {/* Profile Card */}
                <div className="glass rounded-[24px] p-4 sm:p-5">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent/20 flex items-center justify-center">
                            <User className="text-accent sm:w-[28px] sm:h-[28px]" size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] sm:text-sm text-textMuted font-medium">Logged in as</p>
                            <h3 className="text-lg sm:text-xl font-bold text-white">{currentUser}</h3>
                        </div>
                    </div>
                </div>

                {/* Group / Sheet Config */}
                <div className="glass rounded-[24px] overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center space-x-3 text-textMuted">
                            <LinkIcon size={18} />
                            <span className="font-medium text-sm">Google Sheet ID</span>
                        </div>
                        {isTokenExpired && (
                            <div className="flex items-center space-x-1.5 text-negative bg-negative/10 px-2 py-0.5 rounded text-xs font-semibold">
                                <AlertTriangle size={12} />
                                <span>Auth Expired</span>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-white/[0.02]">
                        <p className="font-mono text-xs text-white/70 break-all">{groupConfig?.sheetId}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="glass rounded-[24px] overflow-hidden mt-8">
                    {isTokenExpired && (
                        <button
                            onClick={() => login()}
                            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5 active:bg-white/10"
                        >
                            <div className="flex items-center space-x-3 text-accent">
                                <Key size={18} />
                                <span className="font-medium">Reconnect Google Account</span>
                            </div>
                        </button>
                    )}

                    <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5 active:bg-white/10">
                        <div className="flex items-center space-x-3 text-white/90">
                            <RefreshCcw size={18} />
                            <span className="font-medium">Force Sync</span>
                        </div>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors active:bg-white/10"
                    >
                        <div className="flex items-center space-x-3 text-negative">
                            <LogOut size={18} />
                            <span className="font-medium">Disconnect Group</span>
                        </div>
                    </button>
                </div>

            </div>
        </div>
    );
}
