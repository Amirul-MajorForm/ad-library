'use client';

import type { ProcessedAd } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import CreativeThumbnail from './CreativeThumbnail';

export default function AdCard({
  ad,
  perfClass,
  barPct,
  onClick,
}: {
  ad: ProcessedAd;
  perfClass: 'perf-high' | 'perf-mid' | 'perf-low';
  barPct: number;
  onClick: () => void;
}) {
  const statusClass =
    ad.status === 'ACTIVE' ? 'status-active' : ad.status === 'PAUSED' ? 'status-paused' : 'status-other';

  return (
    <button type="button" className={`ad-card ${perfClass}`} onClick={onClick}>
      <div className="card-creative">
        <CreativeThumbnail src={ad.thumbnail} alt={ad.name} />
        <span className="card-format-badge">{ad.format}</span>
        <span className={`card-status-badge ${statusClass}`}>{ad.status}</span>
      </div>
      <div className="perf-bar-track">
        <div className="perf-bar-fill" style={{ width: `${barPct.toFixed(1)}%` }} />
      </div>
      <div className="card-body">
        <div className="card-ad-name">{ad.name}</div>
        <div className="card-campaign">{ad.campaignName}</div>
        <div className="card-metrics">
          <div className="metric-cell">
            <div className="metric-val">{formatCurrency(ad.spend)}</div>
            <div className="metric-lbl">Spend</div>
          </div>
          <div className="metric-cell">
            <div className="metric-val">{ad.ctr > 0 ? ad.ctr.toFixed(2) + '%' : '—'}</div>
            <div className="metric-lbl">CTR</div>
          </div>
          <div className="metric-cell">
            <div className="metric-val">{ad.cpc > 0 ? formatCurrency(ad.cpc) : '—'}</div>
            <div className="metric-lbl">CPC</div>
          </div>
        </div>
      </div>
      <div className="card-footer">
        <span className="card-account-tag tag tag-meta">Meta</span>
        <span className="card-id">{ad.id}</span>
      </div>
    </button>
  );
}
