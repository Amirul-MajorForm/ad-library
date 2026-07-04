import type { ProcessedAd } from '@/lib/types';
import { formatCurrency, formatNum } from '@/lib/format';

export default function SummaryBar({ ads, days }: { ads: ProcessedAd[]; days: number }) {
  if (!ads.length) {
    return (
      <div className="summary-bar">
        <div className="summary-stat">
          <span className="summary-val">0</span>
          <span className="summary-lbl">ads found</span>
        </div>
      </div>
    );
  }

  const totalSpend = ads.reduce((s, a) => s + a.spend, 0);
  const totalImpressions = ads.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = ads.reduce((s, a) => s + a.clicks, 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const activeCount = ads.filter((a) => a.status === 'ACTIVE').length;

  return (
    <div className="summary-bar">
      <div className="summary-stat">
        <span className="summary-val">{ads.length}</span>
        <span className="summary-lbl">total ads</span>
      </div>
      <div className="summary-sep" />
      <div className="summary-stat">
        <span className="summary-val">{activeCount}</span>
        <span className="summary-lbl">active</span>
      </div>
      <div className="summary-sep" />
      <div className="summary-stat">
        <span className="summary-val">{formatCurrency(totalSpend)}</span>
        <span className="summary-lbl">total spend</span>
      </div>
      <div className="summary-sep" />
      <div className="summary-stat">
        <span className="summary-val">{formatNum(totalImpressions)}</span>
        <span className="summary-lbl">impressions</span>
      </div>
      <div className="summary-sep" />
      <div className="summary-stat">
        <span className="summary-val">{avgCTR.toFixed(2)}%</span>
        <span className="summary-lbl">avg CTR</span>
      </div>
      <div className="summary-sep" />
      <div className="summary-stat">
        <span className="summary-val">Last {days}d</span>
        <span className="summary-lbl">window</span>
      </div>
    </div>
  );
}
