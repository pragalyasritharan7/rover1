import React, { useState } from 'react';
import { runComparison } from '../api/client';
import { useMissionStore } from '../store/useMissionStore';
import { ComparisonData } from '../types/snapshot';

const DEMO_BENCHMARK_DATA: ComparisonData = {
  seeds: [42, 101, 202, 303, 404],
  strategies: ['greedy', 'frontier', 'risk_aware', 'value_aware'],
  table: [
    {
      strategy: 'greedy',
      success_rate: '100.0%',
      explored_pct: '99.87% ± 0.21',
      data_uploaded: '390.0 ± 0.0',
      energy_used: '183.6 ± 11.95',
      steps: '168.4 ± 10.9',
      replans: '37.8 ± 1.3',
    },
    {
      strategy: 'frontier',
      success_rate: '100.0%',
      explored_pct: '99.2% ± 0.75',
      data_uploaded: '390.0 ± 0.0',
      energy_used: '188.4 ± 25.7',
      steps: '172.6 ± 24.48',
      replans: '28.0 ± 1.0',
    },
    {
      strategy: 'risk_aware',
      success_rate: '100.0%',
      explored_pct: '99.49% ± 0.31',
      data_uploaded: '390.0 ± 0.0',
      energy_used: '193.8 ± 14.17',
      steps: '177.8 ± 14.69',
      replans: '28.0 ± 1.0',
    },
    {
      strategy: 'value_aware',
      success_rate: '100.0%',
      explored_pct: '87.84% ± 12.23',
      data_uploaded: '385.0 ± 11.18',
      energy_used: '167.6 ± 30.05',
      steps: '149.8 ± 30.34',
      replans: '22.4 ± 2.7',
    },
  ],
  details: {
    greedy: { summary: { data_uploaded: { mean: 390 }, energy_used: { mean: 183.6 } } },
    frontier: { summary: { data_uploaded: { mean: 390 }, energy_used: { mean: 188.4 } } },
    risk_aware: { summary: { data_uploaded: { mean: 390 }, energy_used: { mean: 193.8 } } },
    value_aware: { summary: { data_uploaded: { mean: 385 }, energy_used: { mean: 167.6 } } },
  },
};

export const ComparisonView: React.FC = () => {
  const config = useMissionStore((s) => s.config);
  const comparisonData = useMissionStore((s) => s.comparisonData);
  const setComparisonData = useMissionStore((s) => s.setComparisonData);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunBenchmark = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runComparison(
        ['greedy', 'frontier', 'risk_aware', 'value_aware'],
        [42, 101, 202, 303, 404],
        config
      );
      setComparisonData(data);
    } catch (err: any) {
      console.warn('Backend benchmark API unavailable; falling back to offline demo benchmark dataset:', err);
      // Fallback to offline demo data if backend is not running
      setComparisonData(DEMO_BENCHMARK_DATA);
      setError('Backend API not detected. Loaded pre-calculated 5-seed benchmark dataset below:');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemoData = () => {
    setError(null);
    setComparisonData(DEMO_BENCHMARK_DATA);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px',
        height: '100%',
        overflowY: 'auto',
        background: 'var(--bg-space)',
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📊</span> STRATEGY BENCHMARKING & COMPARISON
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Empirical multi-seed evaluation measuring exploration coverage, data upload efficiency, and energy safety.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleLoadDemoData}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '10px 18px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '0.5px',
              cursor: 'pointer',
            }}
          >
            📂 LOAD DEMO BENCHMARK
          </button>

          <button
            onClick={handleRunBenchmark}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #00f0ff, #10b981)',
              color: '#070a12',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '13px',
              letterSpacing: '1px',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '⏳ RUNNING 20 SIMULATIONS...' : '⚡ RUN 5-SEED BENCHMARK'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'rgba(0, 229, 255, 0.12)', border: '1px solid var(--neon-cyan)', borderRadius: '6px', color: 'var(--neon-cyan)', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Comparative Visual Bar Charts */}
      {comparisonData && comparisonData.details && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Uploaded Data Comparison */}
          <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600 }}>
              MEAN DATA COMMITTED (HIGHER IS BETTER)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(comparisonData.details).map(([strat, item]: [string, any]) => {
                const meanVal = item.summary?.data_uploaded?.mean ?? 0;
                const maxExpected = 400;
                const widthPct = Math.min(100, (meanVal / maxExpected) * 100);
                return (
                  <div key={strat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                      <span style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--neon-cyan)' }}>{strat}</span>
                      <span style={{ color: 'var(--neon-green)', fontWeight: 700 }}>{meanVal} MB</span>
                    </div>
                    <div style={{ height: '10px', background: '#1e293b', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${widthPct}%`, height: '100%', background: 'var(--neon-green)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Energy Consumed Comparison */}
          <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600 }}>
              MEAN ENERGY EXPENDITURE (LOWER IS MORE EFFICIENT)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(comparisonData.details).map(([strat, item]: [string, any]) => {
                const meanVal = item.summary?.energy_used?.mean ?? 0;
                const maxExpected = 250;
                const widthPct = Math.min(100, (meanVal / maxExpected) * 100);
                return (
                  <div key={strat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                      <span style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--neon-cyan)' }}>{strat}</span>
                      <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>{meanVal} J</span>
                    </div>
                    <div style={{ height: '10px', background: '#1e293b', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${widthPct}%`, height: '100%', background: 'var(--neon-cyan)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Statistical Summary Table */}
      {comparisonData ? (
        <div style={{ background: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-dim)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>STRATEGY</th>
                <th style={{ padding: '12px 16px' }}>SUCCESS RATE</th>
                <th style={{ padding: '12px 16px' }}>EXPLORED %</th>
                <th style={{ padding: '12px 16px' }}>DATA UPLOADED</th>
                <th style={{ padding: '12px 16px' }}>ENERGY USED</th>
                <th style={{ padding: '12px 16px' }}>STEPS</th>
                <th style={{ padding: '12px 16px' }}>REPLANS</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.table.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-dim)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>
                    {row.strategy}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--neon-green)', fontWeight: 700 }}>
                    {row.success_rate}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{row.explored_pct}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--neon-amber)' }}>{row.data_uploaded}</td>
                  <td style={{ padding: '12px 16px' }}>{row.energy_used}</td>
                  <td style={{ padding: '12px 16px' }}>{row.steps}</td>
                  <td style={{ padding: '12px 16px' }}>{row.replans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-panel)',
            padding: '40px',
            textAlign: 'center',
            borderRadius: '8px',
            border: '1px dashed var(--border-dim)',
            color: 'var(--text-muted)',
          }}
        >
          Click "⚡ RUN 5-SEED BENCHMARK" above or "📂 LOAD DEMO BENCHMARK" to view empirical strategy performance comparisons.
        </div>
      )}
    </div>
  );
};
