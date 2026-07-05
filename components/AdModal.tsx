'use client';

import type { ProcessedAd } from '@/lib/types';
import { formatCurrency, formatNum } from '@/lib/format';
import { MAX_ANALYZED_ADS } from '@/lib/constants';
import CreativeThumbnail from './CreativeThumbnail';

function roastBand(score: number): string {
  return score >= 8 ? 'roast-strong' : score >= 5 ? 'roast-attention' : 'roast-critical';
}

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
                {ad.videoSrc ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    src={ad.videoSrc}
                    poster={ad.thumbnail || undefined}
                    controls
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <CreativeThumbnail src={ad.thumbnail} alt={ad.name} />
                )}
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

              {ad.categorization ? (
                <div>
                  <div className="detail-section-title">Creative Profile</div>
                  <div className="meta-row">
                    <div className="meta-item">
                      <span className="meta-key">Type</span>
                      <span className="meta-val">{ad.categorization.creative_type}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-key">Angle</span>
                      <span className="meta-val">{ad.categorization.messaging_angle}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-key">Audience</span>
                      <span className="meta-val">{ad.categorization.target_audience}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <div className="detail-section-title">ROAST Analysis</div>
                {ad.roast ? (
                  <div className="roast-block">
                    <div className="roast-score-row">
                      <div className={`roast-score-big ${roastBand(ad.roast.roast_score)}`}>
                        {ad.roast.roast_score}
                        <span className="roast-score-max">/10</span>
                      </div>
                      <div className="roast-verdict">{ad.roast.roast_verdict}</div>
                    </div>

                    <div className="roast-layers-grid">
                      <div className="roast-layer">
                        <div className="roast-layer-title">
                          {ad.roast.layer1.label} — {ad.roast.layer1.score.toFixed(1)}
                        </div>
                        <div className="roast-dim-row">
                          <span>{ad.format === 'Video' ? 'Hook / opening frame' : 'Hook Strength'}</span>
                          <span>{ad.roast.layer1.hook_strength}</span>
                        </div>
                        <div className="roast-dim-row">
                          <span>Emotional Pull</span>
                          <span>{ad.roast.layer1.emotional_pull}</span>
                        </div>
                        <div className="roast-dim-row">
                          <span>Brand Linkage</span>
                          <span>{ad.roast.layer1.brand_linkage}</span>
                        </div>
                      </div>
                      <div className="roast-layer">
                        <div className="roast-layer-title">
                          {ad.roast.layer2.label} — {ad.roast.layer2.score.toFixed(1)}
                        </div>
                        <div className="roast-dim-row">
                          <span>Message Clarity</span>
                          <span>{ad.roast.layer2.message_clarity}</span>
                        </div>
                        <div className="roast-dim-row">
                          <span>Audience Fit</span>
                          <span>{ad.roast.layer2.audience_fit}</span>
                        </div>
                        <div className="roast-dim-row">
                          <span>CTA Logic</span>
                          <span>{ad.roast.layer2.cta_logic}</span>
                        </div>
                      </div>
                    </div>

                    {ad.roast.diagnosis.length ? (
                      <div className="roast-diagnosis">
                        {ad.roast.diagnosis.map((d, i) => (
                          <div key={i} className="roast-diagnosis-item">
                            <span className="roast-diagnosis-dim">{d.dimension}</span>
                            <span>{d.issue}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="roast-quadrant">
                      <span className="roast-quadrant-name">{ad.roast.quadrant.quadrant_name}</span>
                      <span>{ad.roast.quadrant.quadrant_implication}</span>
                    </div>

                    {ad.roast.recommendations.length ? (
                      <div className="roast-recommendations">
                        {ad.roast.recommendations.map((r, i) => (
                          <div key={i} className="roast-rec-item">
                            <span className="roast-rec-strategy">
                              {'strategy' in r ? r.strategy : r.type === 'cta' ? 'CTA' : 'Visual'}
                            </span>
                            <span className="roast-rec-text">{'headline' in r ? r.headline : r.text}</span>
                            {'rationale' in r ? <span className="roast-rec-rationale">{r.rationale}</span> : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="roast-not-analyzed">
                    Not analyzed in this pull — only the top {MAX_ANALYZED_ADS} ads by spend are auto-analyzed.
                  </div>
                )}
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
