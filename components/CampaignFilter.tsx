'use client';

import { useEffect, useRef, useState } from 'react';

export default function CampaignFilter({
  campaigns,
  selected,
  onChange,
}: {
  campaigns: string[];
  selected: Set<string> | null;
  onChange: (next: Set<string> | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const isAll = selected === null;
  const label = isAll
    ? 'All Campaigns'
    : selected.size === 1
      ? [...selected][0]
      : `${selected.size} Campaigns`;

  function toggleCampaign(name: string) {
    const next = new Set(isAll ? campaigns : selected);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    onChange(next.size === campaigns.length ? null : next);
  }

  function toggleAll() {
    onChange(isAll ? new Set() : null);
  }

  return (
    <div className="campaign-filter" ref={ref}>
      <button type="button" className="campaign-filter-btn" onClick={() => setOpen((o) => !o)}>
        <span className="campaign-filter-label">{label}</span>
        <span className="campaign-filter-caret">▾</span>
      </button>
      {open ? (
        <div className="campaign-filter-panel">
          <button type="button" className="campaign-filter-item campaign-filter-all" onClick={toggleAll}>
            <span className={`campaign-filter-check${isAll ? ' checked' : ''}`} />
            All Campaigns
          </button>
          <div className="campaign-filter-sep" />
          {campaigns.map((name) => {
            const checked = isAll || selected.has(name);
            return (
              <button
                key={name}
                type="button"
                className="campaign-filter-item"
                onClick={() => toggleCampaign(name)}
              >
                <span className={`campaign-filter-check${checked ? ' checked' : ''}`} />
                {name}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
