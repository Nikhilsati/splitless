import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Layout } from './components/Layout';
// Using conditional rendering for simple routing as PRD implies a straightforward PWA
import { DashboardPage } from './pages/DashboardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { MembersPage } from './pages/MembersPage';
import { SettingsPage } from './pages/SettingsPage';
import { SetupPage } from './pages/SetupPage';
import { AddExpenseScreen } from './pages/AddExpensePage';
import { sheetsService } from './services/sheets';
import { syncEngine } from './services/sync';
import { GoogleOAuthProvider } from '@react-oauth/google';

function AppContent() {
  const { currentUser, groupConfig, activeTab, setActiveTab, editingExpense, setEditingExpense } = useStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Load Google API
  useEffect(() => {
    sheetsService.init().then(() => {
      const state = useStore.getState();
      // Restore auth token if valid
      if (state.accessToken && state.tokenExpiresAt && state.tokenExpiresAt > Date.now()) {
        sheetsService.setToken(state.accessToken);
        syncEngine.processQueue(); // Sync any pending data from previous sessions
      }
      setIsInitializing(false);
    }).catch(err => {
      console.error("GAPI Init Error:", err);
      setIsInitializing(false);
    });
  }, []);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bgDark text-textPrimary">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-textMuted">Loading SplitLess...</p>
        </div>
      </div>
    );
  }

  // If no group config OR no selected user, show Setup / Onboarding
  if (!groupConfig || !currentUser) {
    return <SetupPage onComplete={() => setActiveTab('home')} />;
  }

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onAddExpense={() => setShowAddExpense(true)}
    >
      {activeTab === 'home' && <DashboardPage />}
      {activeTab === 'expenses' && <ExpensesPage />}
      {activeTab === 'members' && <MembersPage />}
      {activeTab === 'settings' && <SettingsPage />}

      {/* Full Screen Modal */}
      {showAddExpense && (
        <AddExpenseScreen onClose={() => setShowAddExpense(false)} />
      )}
      {editingExpense && (
        <AddExpenseScreen
          initialExpense={editingExpense}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </Layout>
  );
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}
