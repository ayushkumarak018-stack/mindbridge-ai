import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { ThreatModelModal } from './components/ThreatModelModal';
import { VoiceInputModal } from './components/VoiceInputModal';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { JournalPage } from './pages/JournalPage';
import { ProblemSolverPage } from './pages/ProblemSolverPage';
import { GoalsPage } from './pages/GoalsPage';
import { DecisionPage } from './pages/DecisionPage';
import { BrainstormPage } from './pages/BrainstormPage';
import { InsightsPage } from './pages/InsightsPage';
import { HistorySearchPage } from './pages/HistorySearchPage';
import { MemoryPrivacyPage } from './pages/MemoryPrivacyPage';

export function App() {
  const { user, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [threatModalOpen, setThreatModalOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceCallback, setVoiceCallback] = useState<((text: string) => void) | null>(null);
  const [extraParams, setExtraParams] = useState<any>(null);

  // Handle Tab Switching with optional state payload
  const handleNavigate = (tab: TabType, extra?: any) => {
    setActiveTab(tab);
    setExtraParams(extra || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Voice input modal with confirmation callback
  const handleOpenVoice = (onConfirmed?: (text: string) => void) => {
    setVoiceCallback(() => onConfirmed || null);
    setVoiceModalOpen(true);
  };

  const handleVoiceConfirmed = (text: string) => {
    if (voiceCallback) {
      voiceCallback(text);
    }
  };

  // Auth Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-500">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold tracking-wide uppercase">Initializing MindBridge...</p>
      </div>
    );
  }

  // Unauthenticated -> Landing Page
  if (!user) {
    return (
      <>
        <LandingPage onOpenThreatModal={() => setThreatModalOpen(true)} />
        <ThreatModelModal
          isOpen={threatModalOpen}
          onClose={() => setThreatModalOpen(false)}
        />
      </>
    );
  }

  // Authenticated App Shell
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
        onOpenThreatModal={() => setThreatModalOpen(true)}
        onOpenVoice={() => handleOpenVoice((text) => handleNavigate('journal'))}
      />

      <div className="flex-1 flex">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleNavigate}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigate={handleNavigate}
              onOpenVoice={() => handleOpenVoice((text) => handleNavigate('journal'))}
            />
          )}

          {activeTab === 'journal' && (
            <JournalPage onOpenVoice={handleOpenVoice} />
          )}

          {activeTab === 'problems' && (
            <ProblemSolverPage
              initialProblemId={extraParams?.problemId}
              onOpenVoice={handleOpenVoice}
            />
          )}

          {activeTab === 'goals' && (
            <GoalsPage onOpenVoice={handleOpenVoice} />
          )}

          {activeTab === 'decisions' && (
            <DecisionPage onOpenVoice={handleOpenVoice} />
          )}

          {activeTab === 'brainstorm' && (
            <BrainstormPage
              onOpenVoice={handleOpenVoice}
              onConvertToGoal={(title, desc) => handleNavigate('goals')}
            />
          )}

          {activeTab === 'insights' && (
            <InsightsPage />
          )}

          {activeTab === 'history' && (
            <HistorySearchPage onNavigate={handleNavigate} />
          )}

          {activeTab === 'privacy' && (
            <MemoryPrivacyPage onOpenThreatModal={() => setThreatModalOpen(true)} />
          )}
        </main>
      </div>

      {/* Security Threat Model Modal */}
      <ThreatModelModal
        isOpen={threatModalOpen}
        onClose={() => setThreatModalOpen(false)}
      />

      {/* Voice Recognition Speech-to-Text Modal */}
      <VoiceInputModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onTranscriptionConfirmed={handleVoiceConfirmed}
      />
    </div>
  );
}
export default App;
