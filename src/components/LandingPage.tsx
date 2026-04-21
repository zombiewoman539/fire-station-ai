import React, { useState } from 'react';
import AuthGate from './AuthGate';

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconGrid() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconTrending() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconScenario() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.5 11L15.5 6.5M8.5 13L15.5 17.5" />
    </svg>
  );
}

function IconPresent() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M12 17v4M8 21h8" />
      <path d="M8 10l2.5 2.5L16 7" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6.5" stroke="rgba(34,197,94,0.3)" />
      <path d="M4 7l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── App preview mockup ───────────────────────────────────────────────────────

function AppPreview() {
  const clients = [
    { initials: 'SC', name: 'Sarah Chen', year: '2036', on: true },
    { initials: 'RK', name: 'Raj Kumar', year: '2041', on: false },
    { initials: 'WL', name: 'Wei Lin', year: '2034', on: true },
    { initials: 'JT', name: 'James Tan', year: '2039', on: true },
  ];

  return (
    <div style={{
      background: '#09172a',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: '0 48px 100px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
      userSelect: 'none',
    }}>
      {/* Window chrome */}
      <div style={{
        background: '#0d2040',
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2a2a2a' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2a2a2a' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2a2a2a' }} />
        <span style={{ marginLeft: 14, color: '#3a5268', fontSize: 12, fontWeight: 500 }}>
          Advisor Dashboard
        </span>
      </div>

      <div style={{ padding: '20px 22px 24px' }}>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Clients', value: '24' },
            { label: 'On Track', value: '71%' },
            { label: 'Review', value: '4' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#0f2035',
              borderRadius: 10,
              padding: '11px 14px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ color: '#375060', fontSize: 10, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {stat.label}
              </div>
              <div style={{ color: '#ddeaf5', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div style={{
          background: '#0f2035',
          borderRadius: 12,
          padding: '14px 16px 12px',
          marginBottom: 14,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
          }}>
            <span style={{ color: '#3a5268', fontSize: 11, fontWeight: 500 }}>Sarah Chen — Net Worth</span>
            <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 700 }}>FIRE 2036 ✓</span>
          </div>
          <svg viewBox="0 0 280 58" style={{ width: '100%', height: 50 }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path
              d="M0,54 C30,52 55,47 90,38 C120,30 145,18 185,10 C215,4 248,3 280,2"
              fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round"
            />
            <path
              d="M0,54 C30,52 55,47 90,38 C120,30 145,18 185,10 C215,4 248,3 280,2 L280,58 L0,58 Z"
              fill="url(#g1)"
            />
            <circle cx="185" cy="10" r="4" fill="#22c55e" />
            <line x1="185" y1="10" x2="185" y2="58" stroke="rgba(34,197,94,0.2)" strokeWidth="1" strokeDasharray="3,3" />
          </svg>
        </div>

        {/* Client list */}
        <div>
          {clients.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0',
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: '#1a3050',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#5a9fd4', fontSize: 10, fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {c.initials}
                </div>
                <span style={{ color: '#7a9ab0', fontSize: 13, fontWeight: 500 }}>{c.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#2e4255', fontSize: 12 }}>FIRE {c.year}</span>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: c.on ? '#22c55e' : '#f59e0b',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: React.ReactNode;
  color: string;
  title: string;
  desc: string;
  style?: React.CSSProperties;
}

function FeatureCard({ icon, color, title, desc, style }: FeatureCardProps) {
  const hex = (opacity: number) => {
    const alphas: Record<number, string> = { 12: '1e', 25: '40', 30: '4d' };
    return `${color}${alphas[opacity] ?? '1e'}`;
  };

  return (
    <div style={{
      background: '#080e1c',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16,
      padding: '28px',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 11,
        background: hex(12),
        border: `1px solid ${hex(25)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
        marginBottom: 20,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: 15, fontWeight: 700, color: '#ddeaf5',
        margin: '0 0 10px', lineHeight: 1.35,
        letterSpacing: '-0.01em',
      }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: '#4a6275', lineHeight: 1.72, margin: 0 }}>
        {desc}
      </p>
    </div>
  );
}

// ─── Pricing card ─────────────────────────────────────────────────────────────

interface PlanProps {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  highlight: boolean;
  badge: string | null;
  onCta: () => void;
}

function PlanCard({ name, price, period, desc, features, cta, highlight, badge, onCta }: PlanProps) {
  return (
    <div style={{
      background: highlight ? '#0d1e35' : '#06101e',
      border: highlight ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: 18,
      padding: '32px 28px',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {badge && (
        <div style={{
          position: 'absolute', top: -11, left: 28,
          background: '#f97316',
          color: '#fff', fontSize: 11, fontWeight: 700,
          padding: '3px 11px', borderRadius: 5,
          letterSpacing: '0.02em',
        }}>
          {badge}
        </div>
      )}

      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#5a7a90', marginBottom: 3 }}>{name}</div>
        <div style={{ fontSize: 12, color: '#334455', marginBottom: 18 }}>{desc}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{
            fontSize: 42, fontWeight: 800, color: '#eaf2fc',
            lineHeight: 1, letterSpacing: '-0.04em',
          }}>
            {price}
          </span>
          <span style={{ fontSize: 14, color: '#334455', marginLeft: 1 }}>{period}</span>
        </div>
      </div>

      <ul style={{
        listStyle: 'none', margin: '0 0 28px', padding: 0,
        display: 'flex', flexDirection: 'column', gap: 11,
        flex: 1,
      }}>
        {features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#7a9aaa' }}>
            <IconCheck />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onCta}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 9,
          border: highlight ? 'none' : '1px solid rgba(255,255,255,0.09)',
          background: highlight ? '#f97316' : 'transparent',
          color: highlight ? '#fff' : '#4a6070',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          transition: 'opacity 0.15s',
        }}
      >
        {cta}
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const plans: Omit<PlanProps, 'onCta'>[] = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    desc: 'For advisors getting started.',
    features: ['3 client profiles', 'FIRE calculations', 'Scenario planning', 'PDF export'],
    cta: 'Get started free',
    highlight: false,
    badge: null,
  },
  {
    name: 'Pro',
    price: 'S$59',
    period: '/month',
    desc: 'For practising advisors.',
    features: ['Unlimited clients', 'Advisor Dashboard', 'Presentation Mode', 'Insights panel'],
    cta: 'Start Pro',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Team',
    price: 'S$149',
    period: '/month',
    desc: 'For agency managers.',
    features: ['Everything in Pro', 'Manager Dashboard', 'Invite advisors', 'Team overview'],
    cta: 'Start Team',
    highlight: false,
    badge: null,
  },
];

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      {/* ── Auth modal ── */}
      {showAuth && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(false); }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.82)',
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
        background: '#050e1c',
        color: '#ddeaf5',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>

        {/* ── Nav ── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(5,14,28,0.9)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.055)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 48px', height: 58,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17,
            }}>🔥</div>
            <span style={{ fontWeight: 700, fontSize: 14.5, color: '#ddeaf5', letterSpacing: '-0.01em' }}>
              FIRE Goals Mapper
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setShowAuth(true)}
              style={{
                padding: '7px 15px', borderRadius: 7,
                border: '1px solid rgba(255,255,255,0.09)',
                background: 'transparent', color: '#7a9ab0',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Sign in
            </button>
            <button
              onClick={() => setShowAuth(true)}
              style={{
                padding: '7px 17px', borderRadius: 7, border: 'none',
                background: '#f97316',
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Get started free
            </button>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '88px 48px 72px',
          display: 'flex',
          gap: 60,
          alignItems: 'center',
        }}>
          {/* Copy */}
          <div style={{ flex: '1 1 400px', minWidth: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 12px', borderRadius: 6,
              background: 'rgba(249,115,22,0.07)',
              border: '1px solid rgba(249,115,22,0.18)',
              marginBottom: 28,
            }}>
              <div style={{ width: 5.5, height: 5.5, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
              <span style={{ color: '#f97316', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.04em' }}>
                Singapore financial advisors
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(34px, 4.5vw, 52px)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#eaf2fc',
              margin: '0 0 20px',
            }}>
              Know every client's retirement runway. At a glance.
            </h1>

            <p style={{
              fontSize: 17,
              color: '#4a6275',
              lineHeight: 1.78,
              margin: '0 0 38px',
              maxWidth: 460,
            }}>
              Live FIRE projections, portfolio analytics, and a client presentation layer —
              all in one place. Built for advisors who work with numbers, not around them.
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => setShowAuth(true)}
                style={{
                  padding: '12px 26px', borderRadius: 9, border: 'none',
                  background: '#f97316',
                  color: '#fff', fontSize: 14.5, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 0 0 1px rgba(249,115,22,0.25), 0 6px 20px rgba(249,115,22,0.18)',
                  letterSpacing: '-0.01em',
                }}
              >
                Start for free
              </button>
              <button
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  padding: '12px 22px', borderRadius: 9,
                  border: '1px solid rgba(255,255,255,0.09)',
                  background: 'transparent',
                  color: '#4a6275', fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
                  letterSpacing: '-0.01em',
                }}
              >
                View pricing
              </button>
            </div>

            {/* Sub-proof */}
            <div style={{
              display: 'flex', gap: 20, marginTop: 36, flexWrap: 'wrap',
            }}>
              {['No credit card required', 'Free forever plan', 'Cancel anytime'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#2e4055', fontSize: 13 }}>
                  <span style={{ color: '#22c55e', fontSize: 14 }}>✓</span>
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* App preview */}
          <div style={{ flex: '1 1 420px', minWidth: 0 }}>
            <AppPreview />
          </div>
        </section>

        {/* ── Features ── */}
        <section style={{ padding: '32px 48px 80px', maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ marginBottom: 44 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#2e4255', margin: '0 0 14px',
            }}>
              What you get
            </p>
            <h2 style={{
              fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700,
              color: '#eaf2fc', margin: 0,
              letterSpacing: '-0.025em', lineHeight: 1.2,
              maxWidth: 480,
            }}>
              Built for how advisors actually work
            </h2>
          </div>

          {/* Bento: 5-column grid, cards placed explicitly */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gridTemplateRows: 'auto auto',
            gap: 14,
          }}>
            <FeatureCard
              icon={<IconGrid />}
              color="#818cf8"
              title="Portfolio intelligence, not just data"
              desc="See all your clients on one dashboard. Coverage gaps, FIRE readiness scores, and review flags surface automatically — so you know exactly where to focus before you open a single file."
              style={{ gridColumn: '1 / 4', gridRow: '1 / 2' }}
            />
            <FeatureCard
              icon={<IconTrending />}
              color="#f97316"
              title="Projections that update as you talk"
              desc="Adjust an assumption mid-meeting. The 30-year chart redraws instantly — no recalculations, no spreadsheet refresh."
              style={{ gridColumn: '4 / 6', gridRow: '1 / 2' }}
            />
            <FeatureCard
              icon={<IconScenario />}
              color="#34d399"
              title="Model the hard conversations"
              desc="One click to show the financial impact of a critical illness, TPD, or death — with insurance payouts factored in. Justifies coverage without a pitch."
              style={{ gridColumn: '1 / 3', gridRow: '2 / 3' }}
            />
            <FeatureCard
              icon={<IconPresent />}
              color="#38bdf8"
              title="Present, don't just plan"
              desc="A distraction-free full-screen mode designed for client meetings. The numbers front-and-centre. No open tabs, no tool chrome, no explaining why the app looks like a spreadsheet."
              style={{ gridColumn: '3 / 6', gridRow: '2 / 3' }}
            />
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" style={{ padding: '32px 48px 100px', maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#2e4255', margin: '0 0 14px',
            }}>
              Pricing
            </p>
            <h2 style={{
              fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700,
              color: '#eaf2fc', margin: '0 0 12px',
              letterSpacing: '-0.025em',
            }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: '#2e4255', fontSize: 15, margin: 0 }}>
              All prices ex-GST · Save 17% with annual billing
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 14,
            alignItems: 'start',
          }}>
            {plans.map(plan => (
              <PlanCard key={plan.name} {...plan} onCta={() => setShowAuth(true)} />
            ))}
          </div>

          <p style={{ textAlign: 'center', color: '#1e2e3a', fontSize: 13, marginTop: 28 }}>
            Team managers pay S$149/mo. Advisors under them each hold their own Pro subscription.
          </p>
        </section>

        {/* ── Final CTA ── */}
        <section style={{
          maxWidth: 1180, margin: '0 auto',
          padding: '0 48px 100px',
        }}>
          <div style={{
            background: '#080e1c',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            padding: '60px 48px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Glow orb */}
            <div style={{
              position: 'absolute',
              top: -60, left: '50%', transform: 'translateX(-50%)',
              width: 300, height: 300,
              background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <h2 style={{
              fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 800,
              color: '#eaf2fc', margin: '0 0 16px',
              letterSpacing: '-0.03em', lineHeight: 1.15,
              position: 'relative',
            }}>
              Start mapping your clients' FIRE&nbsp;journey today.
            </h2>
            <p style={{
              color: '#3a5268', fontSize: 16, margin: '0 auto 36px',
              maxWidth: 420, lineHeight: 1.65, position: 'relative',
            }}>
              Free to start. No credit card. Takes 2 minutes to set up your first client projection.
            </p>
            <button
              onClick={() => setShowAuth(true)}
              style={{
                padding: '14px 36px', borderRadius: 10, border: 'none',
                background: '#f97316',
                color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 0 0 1px rgba(249,115,22,0.3), 0 8px 28px rgba(249,115,22,0.2)',
                position: 'relative',
                letterSpacing: '-0.01em',
              }}
            >
              Get started free
            </button>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.045)',
          padding: '24px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              background: 'linear-gradient(135deg, #f97316, #dc2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>🔥</div>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#233040' }}>FIRE Goals Mapper</span>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <a href="/privacy" style={{ color: '#1e2e3a', fontSize: 13, textDecoration: 'none' }}>
              Privacy Policy
            </a>
            <span style={{ color: '#141e28', fontSize: 13 }}>© 2025 FIRE Station</span>
          </div>
        </footer>

      </div>
    </>
  );
}
