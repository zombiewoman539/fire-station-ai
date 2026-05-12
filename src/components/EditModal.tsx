import React from 'react';
import { FireInputs } from '../types';
import { ClientProfile } from '../profileTypes';
import { PersonalSection } from './EditModal/PersonalSection';
import { IncomeSection } from './EditModal/IncomeSection';
import { AssetsSection } from './EditModal/AssetsSection';
import { InsuranceSection } from './EditModal/InsuranceSection';
import { PurchasesSection } from './EditModal/PurchasesSection';
import { EstatePlanningSection } from './EditModal/EstatePlanningSection';
import { ActivitySection } from './EditModal/ActivitySection';

interface Props {
  open: boolean;
  onClose: () => void;
  inputs: FireInputs;
  onChange: (inputs: FireInputs) => void;
  clientName?: string;
  currentProfileId?: string;
  profile?: ClientProfile | null;
  onProfileMetaChange?: (updates: Partial<Pick<ClientProfile, 'lastMeetingDate' | 'nextReviewDate' | 'notes' | 'noteEntries' | 'tags'>>) => void;
  onSaveNow?: () => Promise<boolean>;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  readOnly?: boolean;
}

type Section = 'personal' | 'income' | 'assets' | 'insurance' | 'purchases' | 'estate' | 'activity';

const NAV: { key: Section; icon: string; label: string }[] = [
  { key: 'personal',  icon: '👤', label: 'Personal' },
  { key: 'income',    icon: '💰', label: 'Income & Expenses' },
  { key: 'assets',    icon: '🏦', label: 'Assets' },
  { key: 'insurance', icon: '🛡️', label: 'Insurance' },
  { key: 'purchases', icon: '🏠', label: 'Life Purchases' },
  { key: 'estate',    icon: '📋', label: 'Estate Planning' },
  { key: 'activity',  icon: '📅', label: 'Activity & Notes' },
];

function SaveStatusPill({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') return null;
  const config = {
    saving: { label: 'Saving…',          color: 'var(--text-4)', dot: '#fbbf24' },
    saved:  { label: 'All changes saved', color: '#34d399',       dot: '#34d399' },
    error:  { label: 'Save failed',       color: '#f87171',       dot: '#f87171' },
  }[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: config.color, fontWeight: 500 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: config.dot }} />
      {config.label}
    </span>
  );
}

export default function EditModal({
  open, onClose, inputs, onChange, clientName, currentProfileId,
  profile, onProfileMetaChange, onSaveNow, saveStatus = 'idle', readOnly = false,
}: Props) {
  const [activeSection, setActiveSection] = React.useState<Section>('personal');
  const activeSectionRef = React.useRef(activeSection);
  activeSectionRef.current = activeSection;

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const currentIdx = NAV.findIndex(n => n.key === activeSectionRef.current);
        const nextIdx = e.key === 'ArrowDown'
          ? (currentIdx + 1) % NAV.length
          : (currentIdx - 1 + NAV.length) % NAV.length;
        setActiveSection(NAV[nextIdx].key);
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const isMobile = window.innerWidth < 768;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'stretch' : 'flex-start', justifyContent: 'center', paddingTop: isMobile ? 0 : '4vh' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: isMobile ? '100vw' : 900,
        maxWidth: isMobile ? '100vw' : 'calc(100vw - 32px)',
        maxHeight: isMobile ? '100dvh' : '92vh',
        height: isMobile ? '100dvh' : undefined,
        background: 'var(--surface)', borderRadius: isMobile ? 0 : 16,
        border: '1px solid var(--border)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              {readOnly ? 'Viewing' : 'Editing'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>{clientName || 'Client Details'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!readOnly && <SaveStatusPill status={saveStatus} />}
            {!readOnly && onSaveNow && (
              <button
                onClick={() => { onSaveNow(); }}
                disabled={saveStatus === 'saving'}
                style={{
                  background: saveStatus === 'error' ? '#b91c1c' : '#10b981',
                  border: 'none', borderRadius: 8,
                  padding: '7px 14px', fontSize: 13, fontWeight: 700, color: '#fff',
                  cursor: saveStatus === 'saving' ? 'wait' : 'pointer',
                  opacity: saveStatus === 'saving' ? 0.7 : 1,
                }}
              >
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Retry save' : 'Save'}
              </button>
            )}
            <button onClick={onClose}
              style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: 'var(--text-3)', fontSize: 14 }}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Read-only banner */}
        {readOnly && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 24px',
            background: 'rgba(251,191,36,0.08)',
            borderBottom: '1px solid rgba(251,191,36,0.25)',
            color: '#fbbf24', fontSize: 13, fontWeight: 500, flexShrink: 0,
          }}>
            <span style={{ fontSize: 16 }}>🔒</span>
            <span>
              <strong>Read-only.</strong> This client belongs to another advisor in your team. You can view all details, but changes won't save. Ask the owning advisor to edit, or transfer the client to take ownership.
            </span>
          </div>
        )}

        {/* Body: nav + content */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Nav */}
          {isMobile ? (
            <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', background: 'var(--deep)', flexShrink: 0, padding: '8px 8px 0' }}>
              {NAV.map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  style={{
                    flexShrink: 0, background: 'none', border: 'none',
                    borderBottom: activeSection === item.key ? '2px solid #34d399' : '2px solid transparent',
                    padding: '6px 12px 8px',
                    color: activeSection === item.key ? '#34d399' : 'var(--text-3)',
                    fontSize: 12, fontWeight: activeSection === item.key ? 600 : 400,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--border)', padding: '12px 8px', overflowY: 'auto', background: 'var(--deep)' }}>
              {NAV.map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  style={{
                    width: '100%', textAlign: 'left', background: activeSection === item.key ? 'rgba(16,185,129,0.12)' : 'none',
                    border: activeSection === item.key ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                    borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2,
                    color: activeSection === item.key ? '#34d399' : 'var(--text-2)',
                    fontSize: 13, fontWeight: activeSection === item.key ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (activeSection !== item.key) (e.currentTarget as HTMLButtonElement).style.background = 'var(--card)'; }}
                  onMouseLeave={e => { if (activeSection !== item.key) (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 16px' : '24px 28px' }}>
            {activeSection === 'personal'  && <PersonalSection inputs={inputs} onChange={onChange} />}
            {activeSection === 'income'    && <IncomeSection inputs={inputs} onChange={onChange} />}
            {activeSection === 'assets'    && <AssetsSection inputs={inputs} onChange={onChange} />}
            {activeSection === 'insurance' && <InsuranceSection inputs={inputs} onChange={onChange} currentProfileId={currentProfileId} />}
            {activeSection === 'purchases' && <PurchasesSection inputs={inputs} onChange={onChange} />}
            {activeSection === 'estate'    && <EstatePlanningSection inputs={inputs} onChange={onChange} />}
            {activeSection === 'activity'  && <ActivitySection profile={profile} onMetaChange={onProfileMetaChange ?? (() => {})} />}
          </div>
        </div>
      </div>
    </div>
  );
}
