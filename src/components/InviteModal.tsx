import React, { useState } from 'react';
import { PendingInvite, acceptPendingInvite, declinePendingInvite } from '../services/teamService';
import { useTeam } from '../contexts/TeamContext';

interface Props {
  invite: PendingInvite;
  onDone: () => void;
}

export default function InviteModal({ invite, onDone }: Props) {
  const { refresh } = useTeam();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    setAccepting(true);
    setError('');
    try {
      await acceptPendingInvite();
      await refresh();
      onDone();
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    setError('');
    try {
      await declinePendingInvite();
      await refresh();
      onDone();
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
      setDeclining(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 460, background: 'var(--surface)', borderRadius: 20,
        border: '1px solid var(--border)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        padding: '36px 40px', color: 'var(--text-1)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔥</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', marginBottom: 10 }}>
            You've been invited!
          </div>
          <div style={{
            display: 'inline-block',
            background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)',
            borderRadius: 10, padding: '8px 18px', marginBottom: 16,
          }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#34d399' }}>
              {invite.orgName}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-4)', lineHeight: 1.65 }}>
            You've been invited to join this team as a financial advisor.
            Your manager will be able to see a summary of your client portfolios.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleAccept}
            disabled={accepting || declining}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 10,
              background: accepting ? 'rgba(16,185,129,0.4)' : '#10b981',
              border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: accepting || declining ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {accepting ? 'Joining…' : '✓ Accept Invite'}
          </button>

          <button
            onClick={handleDecline}
            disabled={accepting || declining}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 10,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', fontSize: 14, fontWeight: 600,
              cursor: accepting || declining ? 'not-allowed' : 'pointer',
              opacity: accepting || declining ? 0.6 : 1,
              transition: 'background 0.15s',
            }}
          >
            {declining ? 'Declining…' : 'Decline'}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#f87171', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-5)', textAlign: 'center', lineHeight: 1.5 }}>
          Declining removes the invite. You can continue using FIRE Station solo.
        </div>
      </div>
    </div>
  );
}
