import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ClientProfile } from '../profileTypes';
import {
  listProfiles,
  createProfile,
  deleteProfile,
  renameProfile,
  exportProfile,
  importProfile,
  duplicateProfile,
  saveProfile,
  listDeletedProfiles,
  restoreProfile,
} from '../services/profileStorageSupabase';
import { supabase } from '../services/supabaseClient';

export interface ProfileSummary {
  onTrack: boolean;
  wealthAtRetirement: number;
}

interface Props {
  activeProfile: ClientProfile | null;
  onSelectProfile: (profile: ClientProfile) => void;
  onNewProfile: (profile: ClientProfile) => void;
  onEditDetails: () => void;
  saveStatus: 'saved' | 'saving' | 'idle';
  profileSummaries: Record<string, ProfileSummary>;
}

export default function ProfileManager({ activeProfile, onSelectProfile, onNewProfile, onEditDetails, saveStatus, profileSummaries }: Props) {
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [search, setSearch] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedProfiles, setDeletedProfiles] = useState<(any)[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const refresh = useCallback(async () => {
    try {
      const list = await listProfiles();
      setProfiles(list);
    } catch (e) {
      console.error('Failed to load profiles:', e);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleNew = async () => {
    const name = prompt('Client name:');
    if (!name?.trim()) return;
    try {
      const p = await createProfile(name.trim());
      await refresh();
      onNewProfile(p);
      onEditDetails();
    } catch (e: any) {
      alert('Failed to create profile: ' + e.message);
    }
  };

  const openMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const btn = menuBtnRefs.current[id];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 180) });
    }
    setMenuId(prev => prev === id ? null : id);
  };

  const closeMenu = () => setMenuId(null);

  const handleRename = (profile: ClientProfile) => {
    setRenamingId(profile.id);
    setRenameValue(profile.name);
    closeMenu();
  };

  const commitRename = async (id: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      await renameProfile(id, renameValue.trim());
      await refresh();
      if (activeProfile?.id === id) {
        onSelectProfile({ ...activeProfile, name: renameValue.trim() });
      }
    } catch (e: any) {
      alert('Failed to rename: ' + e.message);
    }
    setRenamingId(null);
  };

  const handleDelete = async (profile: ClientProfile) => {
    closeMenu();
    if (!window.confirm(`Delete "${profile.name}"? This cannot be undone.`)) return;
    try {
      await deleteProfile(profile.id);
      const remaining = await listProfiles();
      setProfiles(remaining);
      if (activeProfile?.id === profile.id) {
        if (remaining.length > 0) {
          onSelectProfile(remaining[0]);
        } else {
          const p = await createProfile('New Client');
          setProfiles([p]);
          onNewProfile(p);
        }
      }
    } catch (e: any) {
      alert('Failed to delete: ' + e.message);
    }
  };

  const handleDuplicate = async (profile: ClientProfile) => {
    closeMenu();
    try {
      const p = await duplicateProfile(profile.id, `${profile.name} (Copy)`);
      if (p) { await refresh(); onSelectProfile(p); }
    } catch (e: any) {
      alert('Failed to duplicate: ' + e.message);
    }
  };

  const handleExport = (profile: ClientProfile) => {
    closeMenu();
    const json = exportProfile(profile);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_FIRE.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => { closeMenu(); fileInputRef.current?.click(); };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const p = await importProfile(reader.result as string);
        await refresh();
        onSelectProfile(p);
      } catch {
        alert('Invalid file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const openRecentlyDeleted = async () => {
    const deleted = await listDeletedProfiles().catch(() => []);
    setDeletedProfiles(deleted);
    setShowDeleted(true);
  };

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      await restoreProfile(id);
      const [updated, restoredList] = await Promise.all([listDeletedProfiles(), listProfiles()]);
      setDeletedProfiles(updated);
      setProfiles(restoredList);
      const restored = restoredList.find(p => p.id === id);
      if (restored) onSelectProfile(restored);
    } catch (e: any) {
      alert('Failed to restore: ' + e.message);
    } finally {
      setRestoringId(null);
    }
  };

  const toggleEstatePlanning = async (profile: ClientProfile, field: 'lpa' | 'will', e: React.MouseEvent) => {
    e.stopPropagation();
    const updated: ClientProfile = {
      ...profile,
      inputs: {
        ...profile.inputs,
        estatePlanning: {
          ...profile.inputs.estatePlanning,
          [field]: !profile.inputs.estatePlanning?.[field],
        },
      },
    };
    try {
      await saveProfile(updated);
      await refresh();
      if (activeProfile?.id === profile.id) onSelectProfile(updated);
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    }
  };

  const filtered = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const saveColor = saveStatus === 'saving' ? '#fbbf24' : saveStatus === 'saved' ? '#34d399' : 'transparent';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔥</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>FIRE Station</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Save dot */}
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: saveColor, transition: 'background 0.3s',
              display: saveStatus !== 'idle' ? 'block' : 'none',
            }} title={saveStatus === 'saving' ? 'Saving…' : 'Saved'} />
            {/* Import */}
            <button onClick={handleImport} title="Import JSON"
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', color: 'var(--text-3)', fontSize: 11 }}>
              ↑ Import
            </button>
            {/* New client */}
            <button onClick={handleNew}
              style={{ background: '#10b981', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600 }}>
              + New
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--inset)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '7px 10px 7px 30px',
              fontSize: 13, color: 'var(--text-1)', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Client list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: 12, padding: '24px 0' }}>
            {search ? 'No clients match your search.' : 'No clients yet. Create one above.'}
          </div>
        )}
        {filtered.map(profile => {
          const isActive = profile.id === activeProfile?.id;
          // For the active card, use the live activeProfile from props so toolbar
          // toggles are reflected immediately without waiting for a Supabase refresh.
          const liveProfile = isActive && activeProfile ? activeProfile : profile;
          const isRenaming = renamingId === profile.id;
          const age = liveProfile.inputs?.personal?.currentAge;
          const retAge = liveProfile.inputs?.personal?.retirementAge;
          const ageInfo = (age && retAge) ? `${age} → ${retAge}` : null;
          const summary = profileSummaries[profile.id];
          const ep = liveProfile.inputs?.estatePlanning;
          const lpa = ep?.lpa ?? false;
          const will = ep?.will ?? false;
          // Activity indicators
          const daysSinceMeeting = liveProfile.lastMeetingDate
            ? Math.floor((Date.now() - new Date(liveProfile.lastMeetingDate).getTime()) / 86400000)
            : null;
          const reviewDate = liveProfile.nextReviewDate ? new Date(liveProfile.nextReviewDate) : null;
          const reviewOverdue = reviewDate ? reviewDate < new Date() : false;

          return (
            <div
              key={profile.id}
              onClick={() => !isRenaming && onSelectProfile(profile)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 10px', borderRadius: 10, marginBottom: 2,
                cursor: isRenaming ? 'default' : 'pointer',
                background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--card)'; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: isActive ? 'rgba(16, 185, 129, 0.2)' : 'var(--inset)',
                border: isActive ? '2px solid rgba(16, 185, 129, 0.5)' : '2px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700,
                color: isActive ? '#34d399' : 'var(--text-3)',
              }}>
                {profile.name.charAt(0).toUpperCase()}
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(profile.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename(profile.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{
                      background: 'var(--inset)', border: '1px solid #10b981',
                      borderRadius: 6, padding: '3px 7px', fontSize: 13,
                      color: 'var(--text-1)', outline: 'none', width: '100%',
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#34d399' : 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {profile.name}
                  </div>
                )}
                {!isRenaming && (
                  <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {ageInfo && <span>{ageInfo} yrs</span>}
                    {summary && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                        background: summary.onTrack ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: summary.onTrack ? '#34d399' : '#f87171',
                        border: `1px solid ${summary.onTrack ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }}>
                        {summary.onTrack ? '✓ On Track' : '⚠ Shortfall'}
                      </span>
                    )}
                    {/* Activity indicators */}
                    {daysSinceMeeting !== null && daysSinceMeeting > 180 && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
                        background: 'rgba(239,68,68,0.12)', color: '#f87171',
                        border: '1px solid rgba(239,68,68,0.3)',
                      }} title={`Last met ${daysSinceMeeting} days ago`}>
                        {daysSinceMeeting > 365 ? '1yr+' : '6mo+'} ago
                      </span>
                    )}
                    {reviewOverdue && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
                        background: 'rgba(251,191,36,0.12)', color: '#fbbf24',
                        border: '1px solid rgba(251,191,36,0.3)',
                      }} title="Review is overdue">
                        Review due
                      </span>
                    )}
                    <span
                      title={lpa ? 'LPA done — click to unmark' : 'No LPA — click to mark done'}
                      onClick={e => toggleEstatePlanning(liveProfile, 'lpa', e)}
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
                        background: lpa ? 'rgba(99,102,241,0.2)' : 'rgba(100,116,139,0.1)',
                        color: lpa ? '#818cf8' : 'var(--text-4)',
                        border: `1px solid ${lpa ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                        cursor: 'pointer', userSelect: 'none',
                        transition: 'background 0.15s, color 0.15s',
                      }}>
                      {lpa ? '✓ ' : ''}LPA
                    </span>
                    <span
                      title={will ? 'Will done — click to unmark' : 'No Will — click to mark done'}
                      onClick={e => toggleEstatePlanning(liveProfile, 'will', e)}
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
                        background: will ? 'rgba(99,102,241,0.2)' : 'rgba(100,116,139,0.1)',
                        color: will ? '#818cf8' : 'var(--text-4)',
                        border: `1px solid ${will ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                        cursor: 'pointer', userSelect: 'none',
                        transition: 'background 0.15s, color 0.15s',
                      }}>
                      {will ? '✓ ' : ''}Will
                    </span>
                  </div>
                )}
              </div>

              {/* Menu button */}
              {!isRenaming && (
                <button
                  ref={el => { menuBtnRefs.current[profile.id] = el; }}
                  onClick={e => openMenu(profile.id, e)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-4)', fontSize: 16, padding: '2px 4px',
                    borderRadius: 4, flexShrink: 0,
                    opacity: menuId === profile.id ? 1 : undefined,
                  }}
                  className="menu-btn"
                >⋯</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Recently Deleted link */}
      <div style={{ padding: '6px 12px 0', flexShrink: 0, textAlign: 'center' }}>
        <button
          onClick={openRecentlyDeleted}
          style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Recently Deleted
        </button>
      </div>

      {/* Edit Details button */}
      <div style={{ padding: '8px 12px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <button
          onClick={onEditDetails}
          disabled={!activeProfile}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 10,
            background: activeProfile ? '#10b981' : 'var(--inset)',
            border: 'none', cursor: activeProfile ? 'pointer' : 'not-allowed',
            color: activeProfile ? '#fff' : 'var(--text-4)',
            fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Client Details
        </button>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', marginTop: 6, padding: '7px 0', borderRadius: 8,
            background: 'none', border: '1px solid var(--border)',
            cursor: 'pointer', color: 'var(--text-4)', fontSize: 12,
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Context menu */}
      {menuId && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={closeMenu} />
          <div style={{
            position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 50,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            minWidth: 170, padding: '4px 0',
          }}>
            {[
              { label: 'Rename', icon: '✏', action: () => { const p = profiles.find(x => x.id === menuId); if (p) handleRename(p); } },
              { label: 'Duplicate', icon: '⧉', action: () => { const p = profiles.find(x => x.id === menuId); if (p) handleDuplicate(p); } },
              { label: 'Export JSON', icon: '↓', action: () => { const p = profiles.find(x => x.id === menuId); if (p) handleExport(p); } },
              { label: 'Delete', icon: '🗑', action: () => { const p = profiles.find(x => x.id === menuId); if (p) handleDelete(p); }, danger: true },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  width: '100%', background: 'none', border: 'none', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', fontSize: 13, cursor: 'pointer',
                  color: (item as any).danger ? '#f87171' : 'var(--text-2)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--card)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
              >
                <span style={{ width: 16, textAlign: 'center', fontSize: 12 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Recently Deleted modal */}
      {showDeleted && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }} onClick={() => setShowDeleted(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            zIndex: 101, width: 380, background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 16,
            boxShadow: '0 24px 64px rgba(0,0,0,0.45)', padding: '24px 24px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Recently Deleted</div>
              <button onClick={() => setShowDeleted(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
                ×
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 16 }}>
              Deleted clients are recoverable for 7 days.
            </div>

            {deletedProfiles.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: 13, padding: '20px 0' }}>
                No recently deleted clients.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {deletedProfiles.map((p: any) => {
                  const daysAgo = Math.floor((Date.now() - new Date(p.deletedAt).getTime()) / 86400000);
                  const daysLeft = 7 - daysAgo;
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 10,
                      background: 'var(--card)', border: '1px solid var(--border)',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--inset)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: 'var(--text-3)',
                      }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, color: daysLeft <= 2 ? '#f87171' : 'var(--text-4)', marginTop: 2 }}>
                          {daysAgo === 0 ? 'Deleted today' : `Deleted ${daysAgo}d ago`} · {daysLeft}d left
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestore(p.id)}
                        disabled={restoringId === p.id}
                        style={{
                          padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                          background: restoringId === p.id ? 'rgba(16,185,129,0.3)' : '#10b981',
                          border: 'none', color: '#fff', cursor: restoringId === p.id ? 'not-allowed' : 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {restoringId === p.id ? '…' : 'Restore'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
