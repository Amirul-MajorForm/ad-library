export type StatusFilter = 'all' | 'ACTIVE' | 'PAUSED' | 'INACTIVE';
export type SortKey = 'spend_desc' | 'spend_asc' | 'ctr_desc' | 'impressions_desc' | 'clicks_desc';

export const SORT_FIELDS: Record<SortKey, { key: 'spend' | 'ctr' | 'impressions' | 'clicks'; dir: 'asc' | 'desc' }> = {
  spend_desc: { key: 'spend', dir: 'desc' },
  spend_asc: { key: 'spend', dir: 'asc' },
  ctr_desc: { key: 'ctr', dir: 'desc' },
  impressions_desc: { key: 'impressions', dir: 'desc' },
  clicks_desc: { key: 'clicks', dir: 'desc' },
};
