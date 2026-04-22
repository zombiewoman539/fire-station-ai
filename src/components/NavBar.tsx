import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTeam } from '../contexts/TeamContext';
import { useSubscription } from '../contexts/SubscriptionContext';

const tabs = [
  {
    to: '/',
    label: 'Clients',
    icon: (
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: '/tasks',
    label: 'Tasks',
    icon: (
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

const settingsTab = {
  to: '/settings',
  label: 'Settings',
  icon: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const ADMIN_USER_ID = 'ef44569c-5216-4847-9b19-3b7797d13ea9';

export default function NavBar() {
  const { isManager, teamStatus } = useTeam();
  const { tier, loaded: subLoaded } = useSubscription();
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    import('../services/supabaseClient').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
    });
  }, []);

  return (
    <div style={{
      height: 48, flexShrink: 0,
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 8,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      zIndex: 100,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
        <span style={{ fontSize: 18 }}>🔥</span>
        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
          FIRE Station
        </span>
      </div>

      {/* Left tabs */}
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
            background: isActive ? 'rgba(16,185,129,0.12)' : 'transparent',
            color: isActive ? '#34d399' : 'var(--text-3)',
            border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'transparent'}`,
            transition: 'background 0.15s, color 0.15s',
          })}
        >
          {tab.icon}
          {tab.label}
        </NavLink>
      ))}

      {/* Team tab — Team-tier users and existing managers */}
      {(isManager || tier === 'team') && (
        <NavLink
          to="/team"
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
            background: isActive ? 'rgba(16,185,129,0.12)' : 'transparent',
            color: isActive ? '#34d399' : 'var(--text-3)',
            border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'transparent'}`,
            transition: 'background 0.15s, color 0.15s',
          })}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          {teamStatus?.orgName ?? 'Team'}
        </NavLink>
      )}

      {/* Admin link — only visible to admin user */}
      {currentUserId === ADMIN_USER_ID && (
        <NavLink
          to="/admin"
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
            background: isActive ? 'rgba(239,68,68,0.12)' : 'transparent',
            color: isActive ? '#f87171' : 'var(--text-4)',
            border: `1px solid ${isActive ? 'rgba(239,68,68,0.3)' : 'transparent'}`,
          })}
        >
          🔐 Admin
        </NavLink>
      )}

      {/* Upgrade pill — Starter users only */}
      <div style={{ flex: 1 }} />
      {subLoaded && tier === 'starter' && (
        <NavLink
          to="/plans"
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 8,
            fontSize: 13, fontWeight: 700,
            textDecoration: 'none',
            background: isActive ? 'rgba(79,70,229,0.2)' : 'rgba(79,70,229,0.1)',
            color: '#a5b4fc',
            border: '1px solid rgba(79,70,229,0.3)',
          })}
        >
          ⚡ Upgrade
        </NavLink>
      )}

      {/* Settings */}
      <NavLink
        to={settingsTab.to}
        style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8,
          fontSize: 13, fontWeight: 600,
          textDecoration: 'none',
          background: isActive ? 'rgba(16,185,129,0.12)' : 'transparent',
          color: isActive ? '#34d399' : 'var(--text-3)',
          border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'transparent'}`,
          transition: 'background 0.15s, color 0.15s',
        })}
      >
        {settingsTab.icon}
        {settingsTab.label}
      </NavLink>
    </div>
  );
}
