'use client';

import type { MetaAdAccount } from '@/lib/types';

const DAYS_OPTIONS = [7, 14, 30] as const;

export default function SetupPanel({
  token,
  onTokenChange,
  accounts,
  accountsLoading,
  accountsError,
  onLoadAccounts,
  selectedAccountId,
  onSelectAccount,
  days,
  onDaysChange,
  status,
  onStatusChange,
  onSubmit,
}: {
  token: string;
  onTokenChange: (v: string) => void;
  accounts: MetaAdAccount[] | null;
  accountsLoading: boolean;
  accountsError: string | null;
  onLoadAccounts: () => void;
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
  days: 7 | 14 | 30;
  onDaysChange: (d: 7 | 14 | 30) => void;
  status: 'ACTIVE' | 'ALL';
  onStatusChange: (s: 'ACTIVE' | 'ALL') => void;
  onSubmit: () => void;
}) {
  const tokenOk = token.trim().length > 10;
  const canSubmit = tokenOk && Boolean(selectedAccountId);

  return (
    <div className="setup-panel">
      <p className="setup-eyebrow">Intelligence Suite</p>
      <h1 className="setup-title">Live Ad Creative Viewer</h1>
      <p className="setup-sub">
        Pull active creatives and performance data from your Meta accounts. You&apos;ll need a Meta Marketing API
        token with <code>ads_read</code> and <code>ads_management</code> permissions.
      </p>

      <div className="field-group">
        <div>
          <div className="field-label">Meta API Token</div>
          <input
            className="field-input"
            type="password"
            placeholder="EAAxxxxxxxxxxxxxxxxx"
            autoComplete="off"
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
          />
          <p className="field-hint">Your token is used only in this session and never stored.</p>
        </div>

        <div>
          <div className="field-label">Ad Account</div>
          <div className="account-grid">
            {accountsLoading ? (
              <div className="field-note">Loading accounts...</div>
            ) : accountsError ? (
              <div className="field-note error">{accountsError}</div>
            ) : !accounts ? (
              <div className="field-note">
                Enter your token above, then click &quot;Load Accounts&quot; to fetch all accessible ad accounts.
              </div>
            ) : accounts.length === 0 ? (
              <div className="field-note">No ad accounts found for this token.</div>
            ) : (
              accounts.map((acc) => (
                <button
                  type="button"
                  key={acc.id}
                  className={`account-chip${selectedAccountId === acc.id ? ' selected' : ''}`}
                  onClick={() => onSelectAccount(acc.id)}
                >
                  <div className="account-chip-name">{acc.name}</div>
                  <div className="account-chip-id">{acc.id}</div>
                </button>
              ))
            )}
          </div>
          <button
            className="btn-secondary"
            style={{ marginTop: 4 }}
            disabled={!tokenOk || accountsLoading}
            onClick={onLoadAccounts}
          >
            Load Accounts
          </button>
        </div>

        <div>
          <div className="field-label">Date Range</div>
          <div className="date-range-row">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`date-btn${days === d ? ' selected' : ''}`}
                onClick={() => onDaysChange(d)}
              >
                Last {d} days
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="field-label">Ad Status</div>
          <div className="date-range-row">
            <button
              type="button"
              className={`date-btn${status === 'ACTIVE' ? ' selected' : ''}`}
              onClick={() => onStatusChange('ACTIVE')}
            >
              Active only
            </button>
            <button
              type="button"
              className={`date-btn${status === 'ALL' ? ' selected' : ''}`}
              onClick={() => onStatusChange('ALL')}
            >
              All statuses
            </button>
          </div>
        </div>
      </div>

      <button className="btn-primary" disabled={!canSubmit} onClick={onSubmit}>
        Pull Live Ads
      </button>
    </div>
  );
}
