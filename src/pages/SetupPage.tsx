import { useState } from 'react';
import { useStore } from '../store/useStore';
import { extractSheetId } from '../lib/utils';
import { sheetsService } from '../services/sheets';

import { useGoogleLogin } from '@react-oauth/google';

export function SetupPage({ onComplete }: { onComplete: () => void }) {
    const { groupConfig, setGroupConfig, setCurrentUser, setAuthToken } = useStore();

    const [sheetInput, setSheetInput] = useState(groupConfig?.sheetId || '');
    const [nameInput, setNameInput] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(!groupConfig ? 1 : 2); // 1 = Sheet, 2 = User

    const doSetup = async (accessToken?: string) => {
        const sheetId = extractSheetId(sheetInput);
        if (!sheetId) {
            setError('Invalid Google Sheet ID or URL');
            setIsLoading(false);
            return;
        }

        try {
            if (accessToken) {
                sheetsService.setToken(accessToken);
            }

            // Ensure structure is correct
            await sheetsService.setupInitialSheet(sheetId);

            // Success
            setGroupConfig({ name: 'My Group', sheetId });
            setStep(2);
        } catch (err: any) {
            setError(err?.result?.error?.message || 'Failed to connect to Google Sheet. Check permissions.');
        } finally {
            setIsLoading(false);
        }
    };

    const login = useGoogleLogin({
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        onSuccess: (tokenResponse) => {
            setAuthToken(tokenResponse.access_token, Date.now() + tokenResponse.expires_in * 1000);
            doSetup(tokenResponse.access_token);
        },
        onError: () => {
            setError('Google login failed. Please try again.');
            setIsLoading(false);
        }
    });

    const handleNextStep = async () => {
        setError('');

        if (step === 1) {
            setIsLoading(true);
            if (!sheetsService.isSignedIn()) {
                login();
            } else {
                await doSetup();
            }
        } else if (step === 2) {
            if (!nameInput.trim()) {
                setError('Please enter your name');
                return;
            }
            setIsLoading(true);
            try {
                const sheetId = groupConfig!.sheetId;
                // Fetch current members to avoid duplicates or register new
                const members = await sheetsService.getMembers(sheetId);
                const name = nameInput.trim();

                const existing = members.find(m => m.name.toLowerCase() === name.toLowerCase());
                if (!existing) {
                    await sheetsService.addMember(sheetId, { name, joined_at: new Date().toISOString() });
                }

                setCurrentUser(name);
                onComplete();
            } catch (err: any) {
                setError('Failed to save user. Check Sheet permissions.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
            {/* Background blobs for glassmorphism effect backdrop */}
            <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-accent/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-accent/10 rounded-full blur-[100px]" />

            <div className="glass w-full max-w-sm rounded-[24px] p-6 sm:p-8 z-10 flex flex-col space-y-6">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                    SplitLess
                </h1>

                {step === 1 ? (
                    <>
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold">Connect Sheet</h2>
                            <p className="text-sm text-textMuted leading-relaxed">
                                Paste your Google Sheet URL. We'll set up the formatting automatically.
                            </p>
                        </div>

                        <input
                            type="text"
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            value={sheetInput}
                            onChange={(e) => setSheetInput(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                        />
                    </>
                ) : (
                    <>
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold">Who are you?</h2>
                            <p className="text-sm text-textMuted leading-relaxed">
                                Enter your name to track your expenses locally on this device.
                            </p>
                        </div>

                        <input
                            type="text"
                            placeholder="Your Name (e.g. Rahul)"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                        />
                    </>
                )}

                {error && (
                    <div className="p-3 bg-negative/10 border border-negative/20 rounded-lg text-negative text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleNextStep}
                    disabled={isLoading}
                    className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-3.5 rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center space-x-2"
                >
                    {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    <span>{step === 1 ? 'Connect & Continue' : 'Get Started'}</span>
                </button>
            </div>
        </div>
    );
}
