'use client';

import { RANK_METRICS } from '@/lib/ranking';
import type { RankMetric, RankMode } from '@/lib/ranking';

export default function Sidebar({
  rankMode,
  onRankModeChange,
  rankMetric,
  onRankMetricChange,
}: {
  rankMode: RankMode;
  onRankModeChange: (mode: RankMode) => void;
  rankMetric: RankMetric;
  onRankMetricChange: (metric: RankMetric) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section-title">Performance Views</div>
      <button
        type="button"
        className={`sidebar-item${rankMode === 'top' ? ' active' : ''}`}
        onClick={() => onRankModeChange(rankMode === 'top' ? null : 'top')}
      >
        Top Performing Creatives
      </button>
      <button
        type="button"
        className={`sidebar-item${rankMode === 'worst' ? ' active' : ''}`}
        onClick={() => onRankModeChange(rankMode === 'worst' ? null : 'worst')}
      >
        Worst Performing Creatives
      </button>

      {rankMode ? (
        <>
          <div className="sidebar-section-title">Rank By</div>
          <select
            className="sidebar-metric-select"
            value={rankMetric}
            onChange={(e) => onRankMetricChange(e.target.value as RankMetric)}
          >
            {RANK_METRICS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </>
      ) : null}
    </aside>
  );
}
