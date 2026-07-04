'use client';

import type { SortKey, StatusFilter } from '@/lib/uiTypes';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'spend_desc', label: 'Spend: High to Low' },
  { value: 'spend_asc', label: 'Spend: Low to High' },
  { value: 'ctr_desc', label: 'CTR: High to Low' },
  { value: 'impressions_desc', label: 'Impressions: High to Low' },
  { value: 'clicks_desc', label: 'Clicks: High to Low' },
];

export default function Toolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  filter: StatusFilter;
  onFilterChange: (v: StatusFilter) => void;
  sort: SortKey;
  onSortChange: (v: SortKey) => void;
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
      </div>
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
