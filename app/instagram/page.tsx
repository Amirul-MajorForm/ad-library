'use client';

import { useState } from 'react';

type ViewState = 'input' | 'loading' | 'error' | 'report';

interface ContentPillar {
  name: string;
  description: string;
  frequency: string;
  topPost: string;
  strategicPurpose: string;
}

interface Report {
  profileSnapshot: {
    handle: string;
    niche: string;
    followerCount: number;
    postsAnalysed: number;
    overallTone: string;
    aestheticSummary: string;
  };
  contentPillars: ContentPillar[];
  hookAnalysis: {
    dominantHookTypes: string[];
    hookStrength: string;
    bestHookExample: string;
    weaknesses: string;
    recommendation: string;
  };
  copyStrategy: {
    avgCaptionLength: string;
    writingStyle: string;
    ctaUsage: string;
    emojiUsage: string;
    hashtagStrategy: string;
    copyStrengths: string;
    copyGaps: string;
  };
  engagementPatterns: {
    avgLikesPerPost: number;
    avgCommentsPerPost: number;
    bestPerformingFormat: string;
    bestPerformingPillar: string;
    engagementInsight: string;
  };
  creativeOpportunities: {
    opportunity: string;
    rationale: string;
    howTo: string;
  }[];
  paidAdPotential: {
    topOrganicToTest: string;
    suggestedAdFormats: string[];
    audienceSignals: string;
    creativeAngle: string;
  };
  strategistVerdict: string;
}

const PILLAR_COLORS = [
  { bg: '#eff6ff', border: '#bfdbfe', label: '#1d4ed8' },
  { bg: '#f0fdf4', border: '#bbf7d0', label: '#15803d' },
  { bg: '#fdf4ff', border: '#e9d5ff', label: '#7e22ce' },
  { bg: '#fff7ed', border: '#fed7aa', label: '#c2410c' },
  { bg: '#fefce8', border: '#fde68a', label: '#92400e' },
];

function strengthColor(s: string) {
  if (s === 'strong') return 'var(--green)';
  if (s === 'weak') return 'var(--red)';
  return 'var(--amber)';
}

function strengthBg(s: string) {
  if (s === 'strong') return 'var(--green-bg)';
  if (s === 'weak') return 'var(--red-bg)';
  return 'var(--amber-bg)';
}

export default function InstagramPage() {
  const [url, setUrl] = useState('');
  const [view, setView] = useState<ViewState>('input');
  const [error, setError] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [meta, setMeta] = useState<{ username?: string; postsScraped?: number } | null>(null);

  async function analyse() {
    if (!url.trim()) return;
    setView('loading');
    setError('');
    try {
      const resp = await fetch('/api/instagram/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setError(data.error || 'Something went wrong.');
        setView('error');
        return;
      }
      setReport(data.report);
      setMeta(data.meta);
      setView('report');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error.');
      setView('error');
    }
  }

  function reset() {
    setView('input');
    setReport(null);
    setMeta(null);
    setError('');
  }

  return (
    <>
      <header className="header">
        <div className="header-left">
          <span className="wordmark">Majorform</span>
          <div className="divider-v" />
          <span className="tool-name">Instagram Analysis</span>
        </div>
        <div className="header-right">
          {view === 'report' && (
            <button className="btn-secondary" onClick={reset}>
              New Analysis
            </button>
          )}
          <a href="/" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block', padding: '8px 14px', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px' }}>
            Live Ads
          </a>
        </div>
      </header>

      {view === 'input' && (
        <div className="setup-panel">
          <p className="setup-eyebrow">Creative Intelligence</p>
          <h1 className="setup-title">Instagram Profile Analysis</h1>
          <p className="setup-sub">
            Drop in any public Instagram profile URL. Claude will analyse the last 30 posts and return a structured creative strategy report — content pillars, hook patterns, copy strategy, engagement signals, and ad potential.
          </p>
          <div className="field-group">
            <div>
              <p className="field-label">Instagram Profile URL</p>
              <input
                className="field-input"
                type="url"
                placeholder="https://www.instagram.com/username"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && analyse()}
              />
              <p className="field-hint">Public profiles only. E.g. https://www.instagram.com/nike</p>
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={analyse}
            disabled={!url.trim()}
          >
            Analyse Profile
          </button>
        </div>
      )}

      {view === 'loading' && (
        <div className="loading-state">
          <div className="spinner" />
          <p className="loading-text">Scraping profile & analysing...</p>
          <p className="loading-sub">Pulling the last 30 posts via Apify, then running Claude creative analysis. This takes 30–60 seconds.</p>
        </div>
      )}

      {view === 'error' && (
        <div className="error-state">
          <p className="error-title">Analysis failed</p>
          <p className="error-msg">{error}</p>
          <button className="btn-secondary" style={{ marginTop: 12 }} onClick={reset}>Try Again</button>
        </div>
      )}

      {view === 'report' && report && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>

          {/* Profile header */}
          <div style={{ marginBottom: 36 }}>
            <p className="setup-eyebrow">Creative Strategy Report</p>
            <h1 className="setup-title" style={{ marginBottom: 4 }}>{report.profileSnapshot.handle}</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {report.profileSnapshot.niche} &nbsp;·&nbsp; {report.profileSnapshot.overallTone}
              {meta?.postsScraped ? ` · ${meta.postsScraped} posts analysed` : ''}
            </p>
            <div style={{ padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {report.profileSnapshot.aestheticSummary}
            </div>
          </div>

          <Divider label="Content Pillars" />

          {/* 5 content pillars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 36 }}>
            {report.contentPillars.slice(0, 5).map((pillar, i) => {
              const c = PILLAR_COLORS[i % PILLAR_COLORS.length];
              return (
                <div key={i} style={{ padding: '18px 20px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {i + 1}. {pillar.name}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: c.label, background: 'rgba(255,255,255,0.7)', padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {pillar.frequency}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>{pillar.description}</p>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.label, marginBottom: 4 }}>Strategic Purpose</div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{pillar.strategicPurpose}</p>
                  {pillar.topPost && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.label, marginTop: 10, marginBottom: 4 }}>Top Example</div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>{pillar.topPost}</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <Divider label="Hook Analysis" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 36 }}>
            <div style={{ padding: '16px 18px', background: strengthBg(report.hookAnalysis.hookStrength), border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: strengthColor(report.hookAnalysis.hookStrength), marginBottom: 6 }}>
                Hook Strength
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: strengthColor(report.hookAnalysis.hookStrength), letterSpacing: '-0.02em', marginBottom: 10 }}>
                {report.hookAnalysis.hookStrength.toUpperCase()}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 6 }}>Hook types used</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {report.hookAnalysis.dominantHookTypes.map((t, i) => (
                  <span key={i} style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoBlock label="Best Hook Example" text={report.hookAnalysis.bestHookExample} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 36 }}>
            <InfoBlock label="Weaknesses" text={report.hookAnalysis.weaknesses} accent="var(--red)" />
            <InfoBlock label="Recommendation" text={report.hookAnalysis.recommendation} accent="var(--blue)" />
          </div>

          <Divider label="Copy Strategy" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <StatTile label="Caption Length" value={report.copyStrategy.avgCaptionLength} />
            <StatTile label="Emoji Usage" value={report.copyStrategy.emojiUsage} />
            <StatTile label="CTA Usage" value={report.copyStrategy.ctaUsage} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 36 }}>
            <InfoBlock label="Writing Style & Voice" text={report.copyStrategy.writingStyle} />
            <InfoBlock label="Hashtag Strategy" text={report.copyStrategy.hashtagStrategy} />
            <InfoBlock label="Copy Strengths" text={report.copyStrategy.copyStrengths} accent="var(--green)" />
            <InfoBlock label="Copy Gaps" text={report.copyStrategy.copyGaps} accent="var(--red)" />
          </div>

          <Divider label="Engagement Patterns" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <StatTile label="Avg Likes" value={report.engagementPatterns.avgLikesPerPost?.toLocaleString() ?? '—'} />
            <StatTile label="Avg Comments" value={report.engagementPatterns.avgCommentsPerPost?.toLocaleString() ?? '—'} />
            <StatTile label="Best Format" value={report.engagementPatterns.bestPerformingFormat} />
            <StatTile label="Best Pillar" value={report.engagementPatterns.bestPerformingPillar} />
          </div>
          <div style={{ padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 36 }}>
            {report.engagementPatterns.engagementInsight}
          </div>

          <Divider label="Creative Opportunities" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
            {report.creativeOpportunities.map((opp, i) => (
              <div key={i} style={{ padding: '16px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {i + 1}. {opp.opportunity}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>{opp.rationale}</p>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 4 }}>How to execute</div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{opp.howTo}</p>
              </div>
            ))}
          </div>

          <Divider label="Paid Ad Potential" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <InfoBlock label="Best Organic to Test as Ad" text={report.paidAdPotential.topOrganicToTest} />
            <InfoBlock label="Audience Signals" text={report.paidAdPotential.audienceSignals} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 36 }}>
            <div style={{ padding: '14px 18px', background: 'var(--blue-bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--blue)', marginBottom: 6 }}>Leading Creative Angle</div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.6 }}>{report.paidAdPotential.creativeAngle}</p>
            </div>
            <div style={{ padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 8 }}>Suggested Ad Formats</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {report.paidAdPotential.suggestedAdFormats.map((f, i) => (
                  <span key={i} style={{ padding: '4px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{f}</span>
                ))}
              </div>
            </div>
          </div>

          <Divider label="Strategist Verdict" />

          <div style={{ padding: '20px 24px', background: 'var(--accent)', borderRadius: 8 }}>
            <p style={{ fontSize: 14, color: '#fff', lineHeight: 1.75, fontWeight: 500 }}>{report.strategistVerdict}</p>
          </div>

        </div>
      )}
    </>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function InfoBlock({ label, text, accent }: { label: string; text: string; accent?: string }) {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: accent || 'var(--text-tertiary)', marginBottom: 6 }}>{label}</div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{text}</p>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', textTransform: 'capitalize' }}>{value}</div>
    </div>
  );
}
