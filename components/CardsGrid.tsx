'use client';

import type { ProcessedAd } from '@/lib/types';
import { percentile } from '@/lib/format';
import AdCard from './AdCard';
import EmptyState from './EmptyState';

export default function CardsGrid({ ads, onSelect }: { ads: ProcessedAd[]; onSelect: (ad: ProcessedAd) => void }) {
  if (!ads.length) {
    return <EmptyState title="No ads match this filter" sub="Try adjusting your search or filter." />;
  }

  const ctrs = ads.map((a) => a.ctr).filter((c) => c > 0);
  const p66 = percentile(ctrs, 66);
  const p33 = percentile(ctrs, 33);
  const maxCtr = ctrs.length ? Math.max(...ctrs) : 0;

  return (
    <div className="cards-grid">
      {ads.map((ad) => {
        const perfClass = ad.ctr >= p66 ? 'perf-high' : ad.ctr >= p33 ? 'perf-mid' : 'perf-low';
        const barPct = ctrs.length ? Math.min(100, (ad.ctr / (maxCtr || 1)) * 100) : 50;
        return <AdCard key={ad.id} ad={ad} perfClass={perfClass} barPct={barPct} onClick={() => onSelect(ad)} />;
      })}
    </div>
  );
}
