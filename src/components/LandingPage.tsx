import React, { useState } from 'react';
import AuthGate from './AuthGate';

const features = [
  {
    icon: '🇸🇬',
    title: 'Singapore CPF — natively modelled',
    desc: 'OA, SA, MA contributions, BHS, CPF LIFE annuity, and age-banded rates from Jan 2026 — all built in. No spreadsheet workarounds.',
  },
  {
    icon: '📊',
    title: 'Present in client meetings',
    desc: 'Presentation Mode gives you a clean, full-screen view built for client conversations — not internal tools.',
  },
  {
    icon: '👥',
    title: 'Your whole book, in one place',
    desc: 'Create unlimited client profiles, switch between them instantly, and never lose a projection.',
  },
  {
    icon: '🔀',
    title: 'What-If scenario planning',
    desc: 'Model critical illness, TPD, and death — with insurance payouts — to show clients why coverage matters.',
  },
];

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    features: ['3 client profiles', 'FIRE calculations', 'Scenario planning', 'PDF export'],
    cta: 'Get started free',
    highlight: false,
    badge: null,
  },
  {
    name: 'Pro',
    price: 'S$59',
    period: '/month',
    features: ['Unlimited clients', 'Advisor Dashboard', 'Presentation Mode', 'Insights panel'],
    cta: 'Start Pro',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Team',
    price: 'S$149',
    period: '/month',
    features: ['Everything in Pro', 'Manager Dashboard', 'Invite advisors', 'Team client overview'],
    cta: 'Start Team',
    highlight: false,
    badge: null,
  },
];

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* Auth modal */}
      {showAuth && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(false); }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <AuthGate onAuth={() => {}} />
        </div>
      )}

      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        color: '#f1f5f9',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>

        {/* ── Nav ─────────────────────────────────────────── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(15,23,42,0.92)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 40px', height: 64,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #f97316, #ef4444)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>🔥</div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9', whiteSpace: 'nowrap' }}>
              FIRE Goals Mapper
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowAuth(true)}
              style={{
                padding: '8px 18px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent', color: '#cbd5e1',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              Sign in
            </button>
            <button
              onClick={() => setShowAuth(true)}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #f97316, #ef4444)',
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Get started free
            </button>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────── */}
        <section style={{
          textAlign: 'center',
          padding: '100px 24px 90px',
          maxWidth: 820,
          margin: '0 auto',
        }}>
          <div style={{
            display: 'inline-block',
            padding: '5px 16px', borderRadius: 100,
            background: 'rgba(249,115,22,0.12)',
            border: '1px solid rgba(249,115,22,0.28)',
            color: '#fb923c', fontSize: 13, fontWeight: 500,
            marginBottom: 32,
            letterSpacing: '0.01em',
          }}>
            Built for Singapore financial advisors
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 58px)',
            fontWeight: 800, lineHeight: 1.1,
            margin: '0 0 24px',
            background: 'linear-gradient(160deg, #f1f5f9 40%, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Plan every client's FIRE&nbsp;journey in minutes
          </h1>

          <p style={{
            fontSize: 19, color: '#94a3b8', lineHeight: 1.7,
            margin: '0 auto 44px',
            maxWidth: 580,
          }}>
            Singapore-native CPF modelling, real-time projections, and a presentation
            mode built for client meetings — not spreadsheets.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowAuth(true)}
              style={{
                padding: '14px 36px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #f97316, #ef4444)',
                color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(249,115,22,0.28)',
              }}
            >
              Start for free
            </button>
            <button
              onClick={scrollToPricing}
              style={{
                padding: '14px 36px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent', color: '#cbd5e1',
                fontSize: 16, fontWeight: 600, cursor: 'pointer',
              }}
            >
              View pricing
            </button>
          </div>

          {/* Social proof strip */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 24, marginTop: 52, flexWrap: 'wrap',
          }}>
            {[
              'CPF 2026 rates',
              'SWR-based FIRE number',
              'Multi-client profiles',
              'PDF reports',
            ].map(tag => (
              <div key={tag} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                color: '#64748b', fontSize: 14,
              }}>
                <span style={{ color: '#10b981', fontSize: 16 }}>✓</span>
                {tag}
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────── */}
        <section style={{
          padding: '80px 24px',
          maxWidth: 1100, margin: '0 auto',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 700, color: '#f1f5f9', margin: '0 0 14px' }}>
              Everything a Singapore FA needs
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 17, margin: 0 }}>
              Built from the ground up for the Singapore market — not adapted from a generic tool.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 24,
          }}>
            {features.map(f => (
              <div key={f.title} style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 16,
                padding: '32px 28px',
                transition: 'border-color 0.2s',
              }}>
                <div style={{ fontSize: 40, marginBottom: 18 }}>{f.icon}</div>
                <h3 style={{
                  fontSize: 16, fontWeight: 700, color: '#f1f5f9',
                  margin: '0 0 10px', lineHeight: 1.3,
                }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────── */}
        <section id="pricing" style={{ padding: '80px 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 700, color: '#f1f5f9', margin: '0 0 14px' }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 17, margin: 0 }}>
              All prices ex-GST. No setup fees. Cancel anytime.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            alignItems: 'stretch',
          }}>
            {plans.map(plan => (
              <div key={plan.name} style={{
                background: plan.highlight ? '#162032' : '#1e293b',
                border: plan.highlight ? '2px solid #f97316' : '1px solid #334155',
                borderRadius: 20,
                padding: '36px 32px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {plan.badge && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #f97316, #ef4444)',
                    color: '#fff', fontSize: 12, fontWeight: 700,
                    padding: '4px 16px', borderRadius: 100,
                    whiteSpace: 'nowrap',
                  }}>
                    {plan.badge}
                  </div>
                )}

                <div style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                  {plan.name}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 28 }}>
                  <span style={{ fontSize: 42, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: 15, color: '#64748b' }}>{plan.period}</span>
                </div>

                <ul style={{
                  listStyle: 'none', margin: '0 0 32px', padding: 0,
                  display: 'flex', flexDirection: 'column', gap: 12,
                  flex: 1,
                }}>
                  {plan.features.map(f => (
                    <li key={f} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      fontSize: 14, color: '#cbd5e1',
                    }}>
                      <span style={{ color: '#10b981', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setShowAuth(true)}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 10,
                    border: plan.highlight ? 'none' : '1px solid #475569',
                    background: plan.highlight
                      ? 'linear-gradient(135deg, #f97316, #ef4444)'
                      : 'transparent',
                    color: plan.highlight ? '#fff' : '#94a3b8',
                    fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', color: '#475569', fontSize: 13, marginTop: 32 }}>
            Save ~17% with annual billing. Team managers and advisors each need their own subscription.
          </p>
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer style={{
          borderTop: '1px solid #1e293b',
          padding: '28px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #f97316, #ef4444)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15,
            }}>🔥</div>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#64748b' }}>FIRE Goals Mapper</span>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <a href="/privacy" style={{ color: '#475569', fontSize: 13, textDecoration: 'none' }}>
              Privacy Policy
            </a>
            <span style={{ color: '#334155', fontSize: 13 }}>© 2025 FIRE Station</span>
          </div>
        </footer>

      </div>
    </>
  );
}
