'use client';

import { useMemo, useState } from 'react';
import type { AdStatusFilter, DateRangeDays, MetaAdAccount, ProcessedAd } from '@/lib/types';
import type { SortKey, StatusFilter } from '@/lib/uiTypes';
import { SORT_FIELDS } from '@/lib/uiTypes';
import SetupPanel from '@/components/SetupPanel';
import Toolbar from '@/components/Toolbar';
import SummaryBar from '@/components/SummaryBar';
import CardsGrid from '@/components/CardsGrid';
import AdModal from '@/components/AdModal';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

type View = 'setup' | 'loading' | 'error' | 'results';

interface LoadErrorInfo {
  message: string;
  code?: string;
}

const INITIAL_LOADING_TEXT = 'Fetching ad creatives...';
const INITIAL_LOADING_SUB = 'Connecting to Meta Marketing API';

export default function Home() {
  const [token, setToken] = useState('');
  const [accounts, setAccounts] = useState<MetaAdAccount[] | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [days, setDays] = useState<DateRangeDays>(14);
  const [status, setStatus] = useState<AdStatusFilter>('ACTIVE');

  const [view, setView] = useState<View>('setup');
  const [loadingText, setLoadingText] = useState(INITIAL_LOADING_TEXT);
  const [loadingSub, setLoadingSub] = useState(INITIAL_LOADING_SUB);
  const [loadError, setLoadError] = useState<LoadErrorInfo | null>(null);
  const [allAds, setAllAds] = useState<ProcessedAd[]>([]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('spend_desc');
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string> | null>(null);
  const [selectedAd, setSelectedAd] = useState<ProcessedAd | null>(null);

  const campaignNames = useMemo(
    () => [...new Set(allAds.map((a) => a.campaignName))].sort((a, b) => a.localeCompare(b)),
    [allAds],
  );

  const filteredAds = useMemo(() => {
    const q = search.trim().toLowerCase();
    let ads = [...allAds];
    if (filter !== 'all') ads = ads.filter((a) => a.status === filter);
    if (selectedCampaigns !== null) ads = ads.filter((a) => selectedCampaigns.has(a.campaignName));
    if (q) {
      ads = ads.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.campaignName.toLowerCase().includes(q) ||
          a.body.toLowerCase().includes(q),
      );
    }
    const { key, dir } = SORT_FIELDS[sort];
    ads.sort((a, b) => (dir === 'desc' ? b[key] - a[key] : a[key] - b[key]));
    return ads;
  }, [allAds, search, filter, selectedCampaigns, sort]);

  async function loadAccounts() {
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const resp = await fetch('/api/meta/accounts', { headers: { 'x-meta-token': token.trim() } });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setAccountsError(data.error?.message || 'Failed to load accounts.');
        setAccounts(null);
        return;
      }
      setAccounts(data.accounts || []);
    } catch (e) {
      setAccountsError(e instanceof Error ? `Network error: ${e.message}` : 'Network error.');
      setAccounts(null);
    } finally {
      setAccountsLoading(false);
    }
  }

  async function fetchAds(overrideDays?: DateRangeDays) {
    if (!token.trim() || !selectedAccountId) return;
    const effectiveDays = overrideDays ?? days;
    if (overrideDays !== undefined) setDays(overrideDays);

    setView('loading');
    setLoadingText(INITIAL_LOADING_TEXT);
    setLoadingSub(INITIAL_LOADING_SUB);
    setLoadError(null);

    try {
      setLoadingText('Pulling ads and insights...');
      setLoadingSub(`Fetching ${effectiveDays}-day window`);

      const params = new URLSearchParams({
        accountId: selectedAccountId,
        days: String(effectiveDays),
        status,
      });
      const resp = await fetch(`/api/meta/ads?${params.toString()}`, {
        headers: { 'x-meta-token': token.trim() },
      });
      const data = await resp.json();

      if (!resp.ok || data.error) {
        setLoadError({
          message: data.error?.message || 'Could not fetch ads.',
          code: data.error?.code ? `Code ${data.error.code}: ${data.error.fbtrace_id || ''}` : undefined,
        });
        setView('error');
        return;
      }

      const ads: ProcessedAd[] = data.ads || [];
      if (Array.isArray(data.warnings) && data.warnings.length) {
        console.warn('[live-ads] non-fatal issues while enriching ads:', data.warnings);
      }
      setAllAds(ads);
      if (overrideDays === undefined) {
        setSearch('');
        setFilter('all');
        setSort('spend_desc');
        setSelectedCampaigns(null);
      }
      setView('results');
    } catch (e) {
      setLoadError({
        message: 'An unexpected error occurred. Check your token and network connection.',
        code: e instanceof Error ? e.message : undefined,
      });
      setView('error');
    }
  }

  function resetTool() {
    setView('setup');
    setAllAds([]);
    setToken('');
    setAccounts(null);
    setAccountsError(null);
    setSelectedAccountId('');
    setSearch('');
    setFilter('all');
    setSort('spend_desc');
    setSelectedCampaigns(null);
    setSelectedAd(null);
  }

  return (
    <>
      <header className="header">
        <div className="header-left">
          <span className="wordmark">Majorform</span>
          <div className="divider-v" />
          <span className="tool-name">Live Ads</span>
        </div>
        <div className="header-right" style={{ display: view === 'setup' ? 'none' : 'flex' }}>
          <button className="btn-secondary" onClick={resetTool}>
            New Query
          </button>
        </div>
      </header>

      {view === 'setup' ? (
        <SetupPanel
          token={token}
          onTokenChange={setToken}
          accounts={accounts}
          accountsLoading={accountsLoading}
          accountsError={accountsError}
          onLoadAccounts={loadAccounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          days={days}
          onDaysChange={setDays}
          status={status}
          onStatusChange={setStatus}
          onSubmit={() => fetchAds()}
        />
      ) : (
        <div>
          {view === 'loading' ? <LoadingState text={loadingText} sub={loadingSub} /> : null}
          {view === 'error' ? (
            <ErrorState message={loadError?.message || ''} code={loadError?.code} onRetry={resetTool} />
          ) : null}
          {view === 'results' ? (
            <div>
              <Toolbar
                search={search}
                onSearchChange={setSearch}
                filter={filter}
                onFilterChange={setFilter}
                sort={sort}
                onSortChange={setSort}
                days={days}
                onDaysChange={(d) => fetchAds(d)}
                campaigns={campaignNames}
                selectedCampaigns={selectedCampaigns}
                onCampaignsChange={setSelectedCampaigns}
              />
              <SummaryBar ads={allAds} days={days} />
              <div className="cards-container">
                <CardsGrid ads={filteredAds} onSelect={setSelectedAd} />
              </div>
            </div>
          ) : null}
        </div>
      )}

      <AdModal ad={selectedAd} days={days} onClose={() => setSelectedAd(null)} />
    </>
  );
}
