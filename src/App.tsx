import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FireInputs, Scenario } from './types';
import { defaultInputs } from './defaults';
import { calculate } from './calculations';
import { ProfileSummary } from './components/ProfileManager';
import { ClientProfile } from './profileTypes';
import { supabase } from './services/supabaseClient';
import {
  listProfiles,
  createProfile,
  saveProfile,
} from './services/profileStorageSupabase';
import ChartPanel from './components/ChartPanel';
import ProfileManager from './components/ProfileManager';
import EditModal from './components/EditModal';
import ToggleBar from './components/ToggleBar';
import AuthGate from './components/AuthGate';
import InsightsPanel from './components/InsightsPanel';
import MilestoneTracker from './components/MilestoneTracker';
import PresentationMode from './components/PresentationMode';
import ExportReport from './components/ExportReport';
import ScenarioPanel from './components/ScenarioPanel';
import NavBar from './components/NavBar';
import AdvisorDashboard from './components/AdvisorDashboard';
import type { Session } from '@supabase/supabase-js';

type BottomTab = 'none' | 'insights' | 'scenarios';

function Dashboard() {
  const [activeProfile, setActiveProfile] = useState<ClientProfile | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [loading, setLoading] = useState(true);
  const [presenting, setPresenting] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('none');
  const [scenario, setScenario] = useState<Scenario>({ type: 'none', ageAtEvent: 35 });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileSummaries, setProfileSummaries] = useState<Record<string, ProfileSummary>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [theme, toggleTheme] = useTheme();

  // Load initial profile on mount
  useEffect(() => {
    // Safety timeout: if Supabase hangs, unblock the loading screen after 6s
    const timeout = setTimeout(() => setLoading(false), 6000);

    const loadProfiles = async () => {
      // In local dev without auth session, use a local-only profile
      if (isLocalDev) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          const localProfile: ClientProfile = {
            id: 'local-dev',
            name: 'Dev Client',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            inputs: defaultInputs,
          };
          setActiveProfile(localProfile);
          clearTimeout(timeout);
          setLoading(false);
          return;
        }
      }

      try {
        const profiles = await listProfiles();
        const lastActiveId = localStorage.getItem('fire-active-profile');

        let profile: ClientProfile | null = null;
        if (lastActiveId) profile = profiles.find(p => p.id === lastActiveId) || null;
        if (!profile && profiles.length > 0) profile = profiles[0];
        if (!profile) profile = await createProfile('My First Client');

        setActiveProfile(profile);
        localStorage.setItem('fire-active-profile', profile.id);

        // Pre-compute on-track status for every loaded profile
        const summaries: Record<string, ProfileSummary> = {};
        for (const p of profiles) {
          const r = calculate(p.inputs);
          summaries[p.id] = { onTrack: r.onTrack, wealthAtRetirement: r.wealthAtRetirement };
        }
        setProfileSummaries(summaries);
      } catch (e) {
        console.error('Failed to load profiles:', e);
      }
      clearTimeout(timeout);
      setLoading(false);
    };
    loadProfiles();
    return () => clearTimeout(timeout);
  }, []);

  const inputs = activeProfile?.inputs || defaultInputs;
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const toggleExcluded = useCallback((id: string) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Filter inputs by excluded IDs before calculating
  const effectiveInputs = useMemo(() => ({
    ...inputs,
    purchases: inputs.purchases.filter(p => !excludedIds.has(p.id)),
    policies: inputs.policies.filter(p => !excludedIds.has(p.id)),
  }), [inputs, excludedIds]);

  const results = useMemo(() => calculate(effectiveInputs), [effectiveInputs]);

  // Keep active client's on-track badge in sync as inputs change
  useEffect(() => {
    if (!activeProfile) return;
    const r = calculate(inputs); // use full inputs, not filtered
    setProfileSummaries(prev => ({
      ...prev,
      [activeProfile.id]: { onTrack: r.onTrack, wealthAtRetirement: r.wealthAtRetirement },
    }));
  }, [activeProfile, inputs]);

  // Scenario results (recalculated when scenario or inputs change)
  const scenarioResults = useMemo(() => {
    if (scenario.type === 'none') return null;
    return calculate(effectiveInputs, scenario);
  }, [effectiveInputs, scenario]);

  // Keep scenario age in range when profile changes
  useEffect(() => {
    if (inputs.personal.currentAge > scenario.ageAtEvent) {
      setScenario(s => ({ ...s, ageAtEvent: inputs.personal.currentAge + 5 }));
    }
  }, [inputs.personal.currentAge, scenario.ageAtEvent]);

  // Auto-save with debounce
  const handleInputChange = useCallback((newInputs: FireInputs) => {
    if (!activeProfile) return;

    const updated = { ...activeProfile, inputs: newInputs, updatedAt: new Date().toISOString() };
    setActiveProfile(updated);
    setSaveStatus('saving');

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveProfile(updated);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        console.error('Save failed:', e);
        setSaveStatus('idle');
      }
    }, 800);
  }, [activeProfile]);

  const handleSelectProfile = useCallback((profile: ClientProfile) => {
    setActiveProfile(profile);
    localStorage.setItem('fire-active-profile', profile.id);
    setSaveStatus('idle');
  }, []);

  const handleNewProfile = useCallback((profile: ClientProfile) => {
    setActiveProfile(profile);
    localStorage.setItem('fire-active-profile', profile.id);
    setSaveStatus('idle');
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#111827', color: '#9ca3af' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔥</div>
          <div>Loading your clients...</div>
        </div>
      </div>
    );
  }

  // Presentation mode overlay
  if (presenting) {
    return (
      <PresentationMode
        inputs={inputs}
        results={results}
        clientName={activeProfile?.name || 'Client'}
        onExit={() => setPresenting(false)}
      />
    );
  }

  const toggleTab = (tab: BottomTab) => {
    setBottomTab(prev => prev === tab ? 'none' : tab);
  };

  const lpa = inputs.estatePlanning?.lpa ?? false;
  const will = inputs.estatePlanning?.will ?? false;

  const toggleEstatePill = (field: 'lpa' | 'will') => {
    handleInputChange({
      ...inputs,
      estatePlanning: { ...inputs.estatePlanning, [field]: field === 'lpa' ? !lpa : !will },
    });
  };

  // Toolbar buttons for chart panel
  const chartToolbar = (
    <>
      <button
        onClick={() => toggleTab('insights')}
        className="flex items-center gap-1.5"
        style={{
          background: bottomTab === 'insights' ? 'rgba(16, 185, 129, 0.15)' : '#1f2937',
          border: `1px solid ${bottomTab === 'insights' ? 'rgba(16, 185, 129, 0.4)' : '#374151'}`,
          borderRadius: 8,
          color: bottomTab === 'insights' ? '#34d399' : '#d1d5db',
          padding: '8px 14px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Insights
      </button>
      <button
        onClick={() => toggleTab('scenarios')}
        className="flex items-center gap-1.5"
        style={{
          background: bottomTab === 'scenarios' ? 'rgba(239, 68, 68, 0.15)' : '#1f2937',
          border: `1px solid ${bottomTab === 'scenarios' ? 'rgba(239, 68, 68, 0.4)' : '#374151'}`,
          borderRadius: 8,
          color: bottomTab === 'scenarios' ? '#f87171' : '#d1d5db',
          padding: '8px 14px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        What If
      </button>
      <button
        onClick={() => setPresenting(true)}
        className="flex items-center gap-1.5"
        style={{
          background: '#1f2937', border: '1px solid #374151', borderRadius: 8,
          color: '#d1d5db', padding: '8px 14px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Present
      </button>
      {/* Edit details — always accessible even when sidebar is hidden */}
      <button
        onClick={() => setEditModalOpen(true)}
        className="flex items-center gap-1.5"
        style={{
          background: '#1f2937', border: '1px solid #374151', borderRadius: 8,
          color: '#d1d5db', padding: '8px 14px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit
      </button>
      {/* LPA / Will quick-toggle pills */}
      <button
        onClick={() => toggleEstatePill('lpa')}
        title={lpa ? 'LPA done — click to unmark' : 'LPA not done — click to mark done'}
        style={{
          background: lpa ? 'rgba(99,102,241,0.2)' : 'var(--card)',
          border: `1px solid ${lpa ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
          borderRadius: 8, padding: '7px 11px', cursor: 'pointer',
          color: lpa ? '#818cf8' : 'var(--text-4)',
          fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
          transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        }}
      >
        {lpa ? '✓ ' : ''}LPA
      </button>
      <button
        onClick={() => toggleEstatePill('will')}
        title={will ? 'Will done — click to unmark' : 'Will not done — click to mark done'}
        style={{
          background: will ? 'rgba(99,102,241,0.2)' : 'var(--card)',
          border: `1px solid ${will ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
          borderRadius: 8, padding: '7px 11px', cursor: 'pointer',
          color: will ? '#818cf8' : 'var(--text-4)',
          fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
          transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        }}
      >
        {will ? '✓ ' : ''}Will
      </button>
      <ExportReport
        inputs={inputs}
        results={results}
        clientName={activeProfile?.name || 'Client'}
      />
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          background: 'none', border: '1px solid var(--border)',
          borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
          color: 'var(--text-3)', fontSize: 14, lineHeight: 1,
          display: 'flex', alignItems: 'center',
        }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </>
  );

  const isDrawerOpen = bottomTab !== 'none';

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text-1)', position: 'relative' }}>
      {/* Left sidebar: client list */}
      <div style={{
        width: sidebarCollapsed ? 0 : 280,
        minWidth: sidebarCollapsed ? 0 : 280,
        flexShrink: 0, height: '100vh',
        overflow: 'hidden',
        transition: 'width 0.25s ease, min-width 0.25s ease',
        position: 'relative',
      }}>
        <div style={{ width: 280, height: '100%' }}>
          <ProfileManager
            activeProfile={activeProfile}
            onSelectProfile={handleSelectProfile}
            onNewProfile={handleNewProfile}
            onEditDetails={() => setEditModalOpen(true)}
            saveStatus={saveStatus}
            profileSummaries={profileSummaries}
          />
        </div>
      </div>

      {/* Sidebar toggle button */}
      <button
        onClick={() => setSidebarCollapsed(c => !c)}
        title={sidebarCollapsed ? 'Show client list' : 'Hide client list'}
        style={{
          position: 'absolute', left: sidebarCollapsed ? 8 : 268, top: 20, zIndex: 50,
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--card)', border: '1px solid var(--border)',
          color: 'var(--text-3)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          transition: 'left 0.25s ease',
        }}
      >
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Edit Details modal */}
      <EditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        inputs={inputs}
        onChange={handleInputChange}
        clientName={activeProfile?.name}
        currentProfileId={activeProfile?.id}
      />

      {/* Right side: chart + toggleable bottom panel */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Chart panel */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <ChartPanel
            results={results}
            retirementAge={inputs.personal.retirementAge}
            cpfLifeMonthlyPayout={inputs.income.cpfLifeMonthlyPayout}
            toolbar={chartToolbar}
            scenarioResults={scenarioResults}
            isDark={theme === 'dark'}
          />
        </div>

        {/* Toggle bar: include/exclude individual purchases & policies */}
        <ToggleBar
          inputs={inputs}
          excludedIds={excludedIds}
          onToggle={toggleExcluded}
        />

        {/* Collapsible bottom drawer */}
        <div style={{
          maxHeight: isDrawerOpen ? 340 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
          borderTop: isDrawerOpen ? '1px solid var(--border)' : 'none',
          background: 'var(--deep)',
        }}>
          <div style={{ height: 340, overflowY: 'auto' }}>
            {bottomTab === 'insights' && (
              <div style={{ display: 'flex', height: '100%' }}>
                <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
                  <InsightsPanel inputs={inputs} results={results} />
                </div>
                <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid #1e293b', overflowY: 'auto' }}>
                  <MilestoneTracker inputs={inputs} results={results} />
                </div>
              </div>
            )}
            {bottomTab === 'scenarios' && (
              <ScenarioPanel
                inputs={inputs}
                results={results}
                scenarioResults={scenarioResults}
                scenario={scenario}
                onScenarioChange={setScenario}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Skip auth on localhost for dev/preview testing
const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ── Theme ─────────────────────────────────────────────────────────────────────
export type Theme = 'dark' | 'light';

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('fa-theme') as Theme) || 'dark'
  );
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('fa-theme', theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return [theme, toggle];
}

function AppShell() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  useTheme();

  useEffect(() => {
    const timeout = setTimeout(() => setChecking(false), 6000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && !session && window.location.hash.includes('access_token')) return;
      setSession(session);
      clearTimeout(timeout);
      setChecking(false);
    });
    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  if (checking && !isLocalDev) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#9ca3af' }}>
        <div style={{ fontSize: 40 }}>🔥</div>
      </div>
    );
  }

  if (!session && !isLocalDev) {
    return <AuthGate onAuth={() => {}} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <NavBar />
      <div style={{ flex: 1, minHeight: 0 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<AdvisorDashboard />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
