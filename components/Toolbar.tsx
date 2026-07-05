'use client';

import type { DateRangeDays } from '@/lib/types';
import type { SortKey, StatusFilter } from '@/lib/uiTypes';
import CampaignFilter from './CampaignFilter';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'spend_desc', label: 'Spend: High to Low' },
  { value: 'spend_asc', label: 'Spend: Low to High' },
  { value: 'ctr_desc', label: 'CTR: High to Low' },
  { value: 'impressions_desc', label: 'Impressions: High to Low' },
  { value: 'clicks_desc', label: 'Clicks: High to Low' },
];

const DAYS_OPTIONS: DateRangeDays[] = [7, 14, 30];

export default function Toolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  days,
  onDaysChange,
  campaigns,
  selectedCampaigns,
  onCampaignsChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  filter: StatusFilter;
  onFilterChange: (v: StatusFilter) => void;
  sort: SortKey;
  onSortChange: (v: SortKey) => void;
  days: DateRangeDays;
  onDaysChange: (d: DateRangeDays) => void;
  campaigns: string[];
  selectedCampaigns: Set<string> | null;
  onCampaignsChange: (next: Set<string> | null) => void;
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <input
          className="search-input"
          type="text"
          placeholder="Search ads..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="filter-row">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`filter-chip${filter === f.value ? ' active' : ''}`}
              onClick={() => onFilterChange(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <CampaignFilter campaigns={campaigns} selected={selectedCampaigns} onChange={onCampaignsChange} />
      </div>
      <select
        className="sort-select"
        value={days}
        onChange={(e) => onDaysChange(Number(e.target.value) as DateRangeDays)}
      >
        {DAYS_OPTIONS.map((d) => (
          <option key={d} value={d}>
            Last {d} days
          </option>
        ))}
      </select>
      <select className="sort-select" value={sort} onChange={(e) => onSortChange(e.target.value as SortKey)}>
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
