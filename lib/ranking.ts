export type RankMode = 'top' | 'worst' | null;
export type RankMetric = 'ctr' | 'costPerConversion' | 'conversions';

export const RANK_METRICS: { value: RankMetric; label: string; higherIsBetter: boolean }[] = [
  { value: 'ctr', label: 'CTR', higherIsBetter: true },
  { value: 'costPerConversion', label: 'Cost per Conversion', higherIsBetter: false },
  { value: 'conversions', label: 'Conversions', higherIsBetter: true },
];

export const RANK_LIMIT = 10;
