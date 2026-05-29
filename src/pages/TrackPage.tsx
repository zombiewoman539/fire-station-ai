import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { listProfiles, saveProfile } from '../services/profileStorageSupabase';
import {
  listTransactions, createTransaction, updateTransaction, deleteTransaction,
} from '../services/investmentTrackerService';
import { fetchQuotes, refreshQuotes, getFxRate, QuoteResult } from '../services/marketDataService';
import { deriveHoldings } from '../lib/holdings';
import {
  ClientProfile,
} from '../profileTypes';
import {
  InvestmentTransaction, SupportedCurrency, TrackingMeta, HoldingWithMarketData,
} from '../types';
import PortfolioSummary from '../components/Track/PortfolioSummary';
import HoldingsTable from '../components/Track/HoldingsTable';
import PortfolioPieCharts from '../components/Track/PortfolioPieCharts';
import TransactionsLog from '../components/Track/TransactionsLog';
import AddTransactionModal from '../components/Track/AddTransactionModal';
import DividendsPanel from '../components/Track/DividendsPanel';
import SyncToFirePlanButton from '../components/Track/SyncToFirePlanButton';

const DEFAULT_TRACKING_META: TrackingMeta = {
  accounts: [
    { id: 'ibkr', name: 'Interactive Brokers', defaultCurrency: 'USD' },
    { id: 'tiger', name: 'Tiger', defaultCurrency: 'USD' },
  ],
  tickerCategories: {},
  budgetRule: { spending: 20, savings: 20, investments: 50, insurance: 10 },
  baseCurrency: 'SGD',
};

export default function TrackPage() {
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  const [fxRate, setFxRate] = useState<number>(1);  // multiply USD value by this to get base currency
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<InvestmentTransaction | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  const activeProfile = useMemo(
    () => profiles.find(p => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );
  const trackingMeta: TrackingMeta = activeProfile?.inputs.trackingMeta ?? DEFAULT_TRACKING_META;
  const baseCurrency: SupportedCurrency = trackingMeta.baseCurrency;

  // ─── Load profiles + persisted active profile id ──────────────────────────
  useEffect(() => {
    const lastId = localStorage.getItem('fire-active-profile');
    listProfiles().then(loaded => {
      setProfiles(loaded);
      const chosen = loaded.find(p => p.id === lastId) ?? loaded[0];
      if (chosen) setActiveProfileId(chosen.id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ─── Load transactions for active profile ─────────────────────────────────
  useEffect(() => {
    if (!activeProfileId) { setTransactions([]); return; }
    listTransactions(activeProfileId)
      .then(setTransactions)
      .catch(err => console.error('Failed to load transactions', err));
  }, [activeProfileId]);

  // ─── Holdings (derived from transactions) ─────────────────────────────────
  const holdings = useMemo(
    () => deriveHoldings(transactions, trackingMeta),
    [transactions, trackingMeta],
  );

  const uniqueTickers = useMemo(
    () => Array.from(new Set(holdings.filter(h => h.quantity > 0).map(h => h.ticker))),
    [holdings],
  );

  // ─── Fetch market data when tickers change ────────────────────────────────
  const loadQuotes = useCallback(async (force = false) => {
    if (uniqueTickers.length === 0) {
      setQuotes({});
      setLastFetchedAt(Date.now());
      return;
    }
    setRefreshing(true);
    try {
      const q = force ? await refreshQuotes(uniqueTickers) : await fetchQuotes(uniqueTickers);
      setQuotes(q);
      // Get FX (only relevant if we have non-base-currency holdings)
      const needsFx = holdings.some(h => h.currency !== baseCurrency);
      if (needsFx) {
        const rate = await getFxRate('USD', baseCurrency);
        setFxRate(baseCurrency === 'USD' ? 1 : rate);
      } else {
        setFxRate(1);
      }
      setLastFetchedAt(Date.now());
    } finally {
      setRefreshing(false);
    }
  }, [uniqueTickers, holdings, baseCurrency]);

  useEffect(() => { loadQuotes(false); }, [loadQuotes]);

  // ─── Holdings enriched with market data + base-currency conversion ────────
  const enrichedHoldings: HoldingWithMarketData[] = useMemo(() => {
    return holdings.map(h => {
      const q = quotes[h.ticker];
      const price = q?.price ?? null;
      const marketValue = price !== null ? h.quantity * price : null;
      const fxFactor = h.currency === baseCurrency ? 1 : fxRate;
      return {
        ...h,
        marketPricePerUnit: price,
        marketValue,
        unrealizedGain: marketValue !== null ? marketValue - h.costBasis : null,
        unrealizedGainPct: marketValue !== null && h.costBasis > 0
          ? ((marketValue - h.costBasis) / h.costBasis) * 100
          : null,
        marketValueBase: marketValue !== null ? marketValue * fxFactor : null,
        costBasisBase: h.costBasis * fxFactor,
      };
    });
  }, [holdings, quotes, fxRate, baseCurrency]);

  // ─── Mutations ────────────────────────────────────────────────────────────
  const handleCreateTx = async (params: Omit<InvestmentTransaction, 'id' | 'createdAt'>) => {
    const tx = await createTransaction(params);
    setTransactions(prev => [tx, ...prev]);
    setAddModalOpen(false);
    setEditingTx(null);
  };
  const handleUpdateTx = async (id: string, patch: Partial<InvestmentTransaction>) => {
    await updateTransaction(id, patch);
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    setEditingTx(null);
  };
  const handleDeleteTx = async (id: string) => {
    if (!window.confirm('Delete this transaction?')) return;
    await deleteTransaction(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleSetTickerCategory = async (ticker: string, category: string) => {
    if (!activeProfile) return;
    const newMeta: TrackingMeta = {
      ...trackingMeta,
      tickerCategories: { ...trackingMeta.tickerCategories, [ticker]: category },
    };
    const updated: ClientProfile = {
      ...activeProfile,
      inputs: { ...activeProfile.inputs, trackingMeta: newMeta },
    };
    setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
    try { await saveProfile(updated); } catch (e) { console.error('Failed to save category', e); }
  };

  const handleSetBaseCurrency = async (cur: SupportedCurrency) => {
    if (!activeProfile) return;
    const newMeta: TrackingMeta = { ...trackingMeta, baseCurrency: cur };
    const updated: ClientProfile = {
      ...activeProfile,
      inputs: { ...activeProfile.inputs, trackingMeta: newMeta },
    };
    setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
    try { await saveProfile(updated); } catch (e) { console.error('Failed to save currency', e); }
  };

  const handleSyncToFire = async (newInvestments: number, newBuckets: any[]) => {
    if (!activeProfile) return;
    const updated: ClientProfile = {
      ...activeProfile,
      inputs: {
        ...activeProfile.inputs,
        assets: {
          ...activeProfile.inputs.assets,
          investments: newInvestments,
          investmentBuckets: newBuckets,
        },
      },
    };
    setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
    await saveProfile(updated);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: 40, fontSize: 14, background: 'var(--bg)', color: 'var(--text-3)', minHeight: '100%' }}>
        Loading…
      </div>
    );
  }

  if (!activeProfile) {
    return (
      <div style={{ padding: 40, background: 'var(--bg)', color: 'var(--text-1)', minHeight: '100%' }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Track</h1>
        <p style={{ color: 'var(--text-3)', marginTop: 12 }}>
          Create a client profile first, then come back here to track their investments.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text-1)', minHeight: '100%' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Track</h1>
          <div style={{ flex: 1 }} />
          <select
            value={activeProfileId ?? ''}
            onChange={e => { setActiveProfileId(e.target.value); localStorage.setItem('fire-active-profile', e.target.value); }}
            style={selectStyle}
          >
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 0, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: 2 }}>
            {(['SGD', 'USD'] as SupportedCurrency[]).map(c => (
              <button key={c}
                onClick={() => handleSetBaseCurrency(c)}
                style={{
                  padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: baseCurrency === c ? 'var(--accent, #4f46e5)' : 'transparent',
                  color: baseCurrency === c ? '#fff' : 'var(--text-3)',
                }}
              >{c}</button>
            ))}
          </div>
          <SyncToFirePlanButton
            profile={activeProfile}
            holdings={enrichedHoldings}
            baseCurrency={baseCurrency}
            onSync={handleSyncToFire}
          />
        </div>

        {/* Portfolio summary */}
        <PortfolioSummary
          holdings={enrichedHoldings}
          baseCurrency={baseCurrency}
          lastFetchedAt={lastFetchedAt}
          refreshing={refreshing}
          onRefresh={() => loadQuotes(true)}
        />

        {/* Pie charts */}
        {enrichedHoldings.some(h => h.quantity > 0) && (
          <div style={{ marginTop: 16 }}>
            <PortfolioPieCharts
              holdings={enrichedHoldings}
              accounts={trackingMeta.accounts}
              baseCurrency={baseCurrency}
            />
          </div>
        )}

        {/* Holdings table */}
        {enrichedHoldings.some(h => h.quantity > 0) && (
          <div style={{ marginTop: 20 }}>
            <HoldingsTable
              holdings={enrichedHoldings.filter(h => h.quantity > 0)}
              accounts={trackingMeta.accounts}
              quotes={quotes}
              baseCurrency={baseCurrency}
              onSetCategory={handleSetTickerCategory}
            />
          </div>
        )}

        {/* Dividends */}
        {transactions.some(t => t.type === 'dividend') && (
          <div style={{ marginTop: 20 }}>
            <DividendsPanel transactions={transactions} baseCurrency={baseCurrency} fxRate={fxRate} />
          </div>
        )}

        {/* Transactions */}
        <div style={{ marginTop: 20 }}>
          <TransactionsLog
            transactions={transactions}
            accounts={trackingMeta.accounts}
            onAddClick={() => { setEditingTx(null); setAddModalOpen(true); }}
            onEdit={(tx) => { setEditingTx(tx); setAddModalOpen(true); }}
            onDelete={handleDeleteTx}
          />
        </div>

        {/* Add/Edit transaction modal */}
        {addModalOpen && (
          <AddTransactionModal
            clientProfileId={activeProfile.id}
            accounts={trackingMeta.accounts}
            existing={editingTx}
            onClose={() => { setAddModalOpen(false); setEditingTx(null); }}
            onSubmit={async (params) => {
              if (editingTx) {
                await handleUpdateTx(editingTx.id, params);
              } else {
                await handleCreateTx(params);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
  minWidth: 160,
};
