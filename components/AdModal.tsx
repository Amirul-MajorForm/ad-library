'use client';

import type { ProcessedAd } from '@/lib/types';
import { formatCurrency, formatNum } from '@/lib/format';
import CreativeThumbnail from './CreativeThumbnail';

export default function AdModal({ ad, days, onClose }: { ad: ProcessedAd | null; days: number; onClose: () => void }) {
  return (
    <div className={`modal-overlay${ad ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      {ad ? (
        <div className="modal">
          <div className="modal-header">
            <div>
              <div className="modal-title">{ad.name}</div>
              <div className="modal-sub">{ad.campaignName}</div>
            </div>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div>
              <div className="modal-creative">
                <CreativeThumbnail src={ad.thumbnail} alt={ad.name} />
              </div>
            </div>
            <div className="modal-details">
              <div>
                <div className="detail-section-title">Performance — Last {days} days</div>
                <div className="detail-metrics-grid">
                  <DetailMetric val={formatCurrency(ad.spend)} lbl="Spend" />
                  <DetailMetric val={formatNum(ad.impressions)} lbl="Impressions" />
                  <DetailMetric val={formatNum(ad.reach)} lbl="Reach" />
                  <DetailMetric val={formatNum(ad.clicks)} lbl="Clicks" />
                  <DetailMetric val={ad.ctr > 0 ? ad.ctr.toFixed(2) + '%' : '—'} lbl="CTR" />
                  <DetailMetric val={ad.cpc > 0 ? formatCurrency(ad.cpc) : '—'} lbl="CPC" />
                  {ad.frequency > 0 ? <DetailMetric val={ad.frequency.toFixed(2)} lbl="Frequency" /> : null}
                  {ad.conversions > 0 ? <DetailMetric val={String(ad.conversions)} lbl="Conversions" /> : null}
                  {ad.costPerConversion > 0 ? (
                    <DetailMetric val={formatCurrency(ad.costPerConversion)} lbl="Cost/Conv." />
                  ) : null}
                </div>
              </div>

              {ad.body || ad.title ? (
                <div>
                  <div className="detail-section-title">Ad Copy</div>
                  <div className="copy-block">
                    {ad.title ? (
                      <>
                        <strong>{ad.title}</strong>
                        {'\n\n'}
                      </>
                    ) : null}
                    {ad.body}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="detail-section-title">Details</div>
                <div className="meta-row">
                  <div className="meta-item">
                    <span className="meta-key">Ad ID</span>
                    <span className="meta-val mono">{ad.id}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-key">Status</span>
                    <span className="meta-val">{ad.status}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-key">Format</span>
                    <span className="meta-val">{ad.format}</span>
                  </div>
                  {ad.cta ? (
                    <div className="meta-item">
                      <span className="meta-key">CTA</span>
                      <span className="meta-val">{ad.cta.replace(/_/g, ' ')}</span>
                    </div>
                  ) : null}
                  <div className="meta-item">
                    <span className="meta-key">Campaign</span>
                    <span className="meta-val">{ad.campaignName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}

function DetailMetric({ val, lbl }: { val: string; lbl: string }) {
  return (
    <div className="detail-metric">
      <div className="detail-metric-val">{val}</div>
      <div className="detail-metric-lbl">{lbl}</div>
    </div>
  );
}
