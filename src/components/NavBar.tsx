import React from 'react';
import { NavLink } from 'react-router-dom';

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
];

export default function NavBar() {
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

      {/* Tabs */}
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
    </div>
  );
}
