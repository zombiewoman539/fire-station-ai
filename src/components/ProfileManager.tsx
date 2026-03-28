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
} from '../services/profileStorageSupabase';
import { supabase } from '../services/supabaseClient';

interface Props {
  activeProfile: ClientProfile | null;
  onSelectProfile: (profile: ClientProfile) => void;
  onNewProfile: (profile: ClientProfile) => void;
  saveStatus: 'saved' | 'saving' | 'idle';
}

export default function ProfileManager({ activeProfile, onSelectProfile, onNewProfile, saveStatus }: Props) {
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch (e: any) {
      alert('Failed to create profile: ' + e.message);
    }
  };

  const handleSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const p = profiles.find(pr => pr.id === id);
    if (p) onSelectProfile(p);
  };

  const handleRename = () => {
    if (!activeProfile) return;
    setEditName(activeProfile.name);
    setEditing(true);
  };

  const commitRename = async () => {
    if (!activeProfile || !editName.trim()) { setEditing(false); return; }
    try {
      await renameProfile(activeProfile.id, editName.trim());
      await refresh();
      onSelectProfile({ ...activeProfile, name: editName.trim() });
    } catch (e: any) {
      alert('Failed to rename: ' + e.message);
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!activeProfile) return;
    if (!window.confirm(`Delete "${activeProfile.name}"? This cannot be undone.`)) return;
    try {
      await deleteProfile(activeProfile.id);
      const remaining = await listProfiles();
      setProfiles(remaining);
      if (remaining.length > 0) {
        onSelectProfile(remaining[0]);
      } else {
        const p = await createProfile('New Client');
        await refresh();
        onNewProfile(p);
      }
    } catch (e: any) {
      alert('Failed to delete: ' + e.message);
    }
  };

  const handleDuplicate = async () => {
    if (!activeProfile) return;
    try {
      const p = await duplicateProfile(activeProfile.id, `${activeProfile.name} (Copy)`);
      if (p) { await refresh(); onSelectProfile(p); }
    } catch (e: any) {
      alert('Failed to duplicate: ' + e.message);
    }
  };

  const handleExport = () => {
    if (!activeProfile) return;
    const json = exportProfile(activeProfile);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProfile.name.replace(/[^a-zA-Z0-9]/g, '_')}_FIRE.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => fileInputRef.current?.click();

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

  const statusDot = saveStatus === 'saving' ? '#fbbf24' : saveStatus === 'saved' ? '#34d399' : '#6b7280';
  const statusText = saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : '';

  return (
    <div style={{ padding: '10px 16px 10px 16px', borderBottom: '1px solid #374151', background: '#1f2937' }}>
      {/* Profile selector row */}
      <div className="flex items-center gap-2">
        <div className="flex items-center" style={{ fontSize: 14, marginRight: 2 }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
            className="text-white text-sm font-medium bg-gray-700 border border-emerald-500 rounded px-2 py-1 outline-none"
            style={{ flex: 1 }}
          />
        ) : (
          <select
            value={activeProfile?.id || ''}
            onChange={handleSwitch}
            className="text-white text-sm font-medium bg-gray-700 border border-gray-600 rounded px-2 py-1 outline-none cursor-pointer hover:border-gray-500"
            style={{ flex: 1, maxWidth: 220 }}
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {/* Save status */}
        {statusText && (
          <span className="flex items-center gap-1" style={{ fontSize: 10, color: statusDot, flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot, display: 'inline-block' }} />
            {statusText}
          </span>
        )}

        {/* Menu button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-400 hover:text-white"
            style={{ padding: '2px 4px', fontSize: 16, lineHeight: 1 }}
          >
            &#8942;
          </button>
          {showMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowMenu(false)} />
              <div
                style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50,
                  background: '#1f2937', border: '1px solid #374151', borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: 170, padding: '4px 0',
                }}
              >
                {[
                  { label: 'New Client', icon: '+', action: handleNew },
                  { label: 'Rename', icon: '✏', action: handleRename },
                  { label: 'Duplicate', icon: '⧉', action: handleDuplicate },
                  { label: 'Export JSON', icon: '↓', action: handleExport },
                  { label: 'Import JSON', icon: '↑', action: handleImport },
                  { label: 'Delete', icon: '🗑', action: handleDelete, danger: true },
                  { label: 'Sign Out', icon: '→', action: handleLogout, danger: false },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => { item.action(); setShowMenu(false); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
                    style={{ color: (item as any).danger ? '#f87171' : '#d1d5db' }}
                  >
                    <span style={{ width: 16, textAlign: 'center', fontSize: 12 }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* New client shortcut */}
      <button
        onClick={handleNew}
        className="w-full mt-2 py-1.5 text-xs font-medium text-emerald-400 border border-dashed border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors"
      >
        + New Client
      </button>
    </div>
  );
}
