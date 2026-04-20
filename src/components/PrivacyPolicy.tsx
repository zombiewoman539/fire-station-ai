import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-1)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', color: 'var(--text-3)',
            cursor: 'pointer', fontSize: 14, marginBottom: 32, padding: 0,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ← Back
        </button>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔥</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 8px' }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-4)', margin: 0 }}>
            Last updated: April 2026
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, fontSize: 14, lineHeight: 1.8, color: 'var(--text-2)' }}>

          <section>
            <h2 style={headingStyle}>1. Who We Are</h2>
            <p>
              FIRE Station is a financial planning tool for licensed financial advisors in Singapore.
              It is operated by <strong style={{ color: 'var(--text-1)' }}>[Your Company Name]</strong> ("<strong style={{ color: 'var(--text-1)' }}>we</strong>", "<strong style={{ color: 'var(--text-1)' }}>us</strong>", "<strong style={{ color: 'var(--text-1)' }}>our</strong>").
              For privacy-related queries, contact us at{' '}
              <strong style={{ color: 'var(--text-1)' }}>[your@email.com]</strong>.
            </p>
            <p>
              This policy explains how personal data is collected, used, and protected in accordance
              with Singapore's <strong style={{ color: 'var(--text-1)' }}>Personal Data Protection Act 2012 (PDPA)</strong>.
            </p>
          </section>

          <section>
            <h2 style={headingStyle}>2. What Personal Data We Collect</h2>
            <p>When financial advisors use FIRE Station to manage client profiles, the following personal data may be stored:</p>
            <ul style={listStyle}>
              <li>Client names</li>
              <li>Financial information (income, expenses, savings, investment details)</li>
              <li>Insurance policy details (policy numbers, sum assured, premium amounts, insurer names)</li>
              <li>Nominee and beneficiary names</li>
              <li>CPF projections and retirement planning data</li>
              <li>Meeting notes and review dates</li>
            </ul>
            <p>
              We also collect account information for advisors using the platform (name, email address,
              authentication credentials via Google OAuth or email/password).
            </p>
          </section>

          <section>
            <h2 style={headingStyle}>3. Purpose of Collection</h2>
            <p>Personal data is collected solely for the purpose of:</p>
            <ul style={listStyle}>
              <li>Enabling financial advisors to model and track their clients' financial plans</li>
              <li>Generating financial planning reports for client meetings</li>
              <li>Allowing advisory team managers to oversee their advisors' client portfolios</li>
            </ul>
            <p>We do not use client data for marketing, analytics, or any purpose beyond the above.</p>
          </section>

          <section>
            <h2 style={headingStyle}>4. Who Can Access the Data</h2>
            <ul style={listStyle}>
              <li><strong style={{ color: 'var(--text-1)' }}>The advisor</strong> — can access and edit only their own clients' profiles.</li>
              <li><strong style={{ color: 'var(--text-1)' }}>Team managers</strong> — if an advisor is part of a team, their manager can view a summary of the advisor's client portfolios. Managers cannot see other organisations' data.</li>
              <li><strong style={{ color: 'var(--text-1)' }}>FIRE Station operators</strong> — we can access data via the Supabase database dashboard for support and maintenance purposes only.</li>
              <li>No third parties have access to client data.</li>
            </ul>
          </section>

          <section>
            <h2 style={headingStyle}>5. Data Storage and Security</h2>
            <p>All data is stored securely using Supabase (PostgreSQL), hosted on Amazon Web Services. Key security measures include:</p>
            <ul style={listStyle}>
              <li>Encryption at rest (AES-256) and in transit (TLS)</li>
              <li>Row-Level Security (RLS) policies enforced at the database level</li>
              <li>Audit logging of all data modifications</li>
              <li>Access controls ensuring advisors can only access their own clients' data</li>
            </ul>
            <p style={{ color: 'var(--text-4)', fontSize: 13 }}>
              Note: Please confirm your Supabase project region and update this policy accordingly.
            </p>
          </section>

          <section>
            <h2 style={headingStyle}>6. Data Retention</h2>
            <p>
              Client profiles are retained for the duration of the advisor's active account. When an
              advisor deletes a client profile, the data is soft-deleted and retained in our database
              for recovery purposes. Advisors may request permanent deletion by contacting us directly.
            </p>
            <p>
              When an advisor's account is closed, we will delete all associated client data upon request.
            </p>
          </section>

          <section>
            <h2 style={headingStyle}>7. Overseas Transfer of Data</h2>
            <p>
              Data is stored on servers managed by Amazon Web Services. AWS maintains security
              standards comparable to those required under the PDPA. By using FIRE Station, you
              acknowledge that data may be stored outside Singapore on secure, compliant infrastructure.
            </p>
          </section>

          <section>
            <h2 style={headingStyle}>8. Your Rights Under the PDPA</h2>
            <p>Under the PDPA, individuals have the right to:</p>
            <ul style={listStyle}>
              <li><strong style={{ color: 'var(--text-1)' }}>Access</strong> — request a copy of personal data we hold about you</li>
              <li><strong style={{ color: 'var(--text-1)' }}>Correction</strong> — request correction of inaccurate personal data</li>
              <li><strong style={{ color: 'var(--text-1)' }}>Withdrawal of consent</strong> — withdraw consent for use of personal data (note: this may affect your ability to use the platform)</li>
            </ul>
            <p>
              To exercise these rights, contact us at <strong style={{ color: 'var(--text-1)' }}>[your@email.com]</strong>.
              We will respond within 10 business days.
            </p>
          </section>

          <section>
            <h2 style={headingStyle}>9. Data Breach Notification</h2>
            <p>
              In the event of a data breach that is likely to result in significant harm, we will notify
              the Personal Data Protection Commission (PDPC) and affected individuals within 3 business
              days of becoming aware of the breach, in accordance with the PDPA Mandatory Data Breach
              Notification Obligation.
            </p>
          </section>

          <section>
            <h2 style={headingStyle}>10. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be communicated to
              registered advisors by email. Continued use of FIRE Station after changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 style={headingStyle}>11. Contact Us</h2>
            <p>
              For any privacy-related questions or requests, please contact our Data Protection Officer at:{' '}
              <strong style={{ color: 'var(--text-1)' }}>[your@email.com]</strong>
            </p>
          </section>

        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-5)', textAlign: 'center' }}>
          © 2026 FIRE Station. All rights reserved.
        </div>

      </div>
    </div>
  );
}

const headingStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--text-1)',
  margin: '0 0 12px',
};

const listStyle: React.CSSProperties = {
  paddingLeft: 20,
  margin: '8px 0 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};
