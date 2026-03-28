import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { FireInputs } from './types';
import { defaultInputs } from './defaults';
import { calculate } from './calculations';
import { ClientProfile } from './profileTypes';
import { supabase } from './services/supabaseClient';
import {
  listProfiles,
  createProfile,
  saveProfile,
} from './services/profileStorageSupabase';
import InputPanel from './components/InputPanel';
import ChartPanel from './components/ChartPanel';
import ProfileManager from './components/ProfileManager';
import AuthGate from './components/AuthGate';
import type { Session } from '@supabase/supabase-js';

function Dashboard() {
  const [activeProfile, setActiveProfile] = useState<ClientProfile | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [loading, setLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load initial profile on mount
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const profiles = await listProfiles();
        const lastActiveId = localStorage.getItem('fire-active-profile');

        let profile: ClientProfile | null = null;
        if (lastActiveId) profile = profiles.find(p => p.id === lastActiveId) || null;
        if (!profile && profiles.length > 0) profile = profiles[0];
        if (!profile) profile = await createProfile('My First Client');

        setActiveProfile(profile);
        localStorage.setItem('fire-active-profile', profile.id);
      } catch (e) {
        console.error('Failed to load profiles:', e);
      }
      setLoading(false);
    };
    loadProfiles();
  }, []);

  const inputs = activeProfile?.inputs || defaultInputs;
  const results = useMemo(() => calculate(inputs), [inputs]);

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

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#111827', color: '#fff' }}>
      <div
        className="relative flex-shrink-0 h-screen"
        style={{
          width: collapsed ? 0 : 380,
          minWidth: collapsed ? 0 : 380,
          transition: 'width 0.3s ease, min-width 0.3s ease',
          overflow: 'hidden',
        }}
      >
        {/* Toggle button */}
        <button onClick={() => setCollapsed(c => !c)}
          className="absolute z-30 bg-gray-700 hover:bg-gray-600 text-white rounded-full shadow-lg border border-gray-600 flex items-center justify-center"
          style={{ width: 28, height: 28, top: 20, right: -14, cursor: 'pointer' }}
        >
          <svg width="14" height="14" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="h-full flex flex-col bg-gray-800 border-r border-gray-700" style={{ width: 380 }}>
          {/* Profile Manager at top */}
          <ProfileManager
            activeProfile={activeProfile}
            onSelectProfile={handleSelectProfile}
            onNewProfile={handleNewProfile}
            saveStatus={saveStatus}
          />

          {/* Input Panel (scrollable) */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '12px 20px 40px 20px' }}>
            <InputPanel
              inputs={inputs}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>

      {collapsed && (
        <button onClick={() => setCollapsed(false)}
          style={{
            position: 'absolute', left: 8, top: 20, zIndex: 30,
            width: 28, height: 28, borderRadius: '50%',
            background: '#374151', border: '1px solid #4b5563',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <ChartPanel results={results} retirementAge={inputs.personal.retirementAge} />
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#9ca3af' }}>
        <div style={{ fontSize: 40 }}>🔥</div>
      </div>
    );
  }

  if (!session) {
    return <AuthGate onAuth={() => {}} />;
  }

  return <Dashboard />;
}

export default App;
