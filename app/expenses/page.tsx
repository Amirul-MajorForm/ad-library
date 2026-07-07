'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type Step = 'config' | 'upload' | 'extracting' | 'reviewing' | 'submitting' | 'success' | 'error';

interface Config {
  token: string;
  orgId: string;
  baseUrl: string;
}

interface Category {
  id: string;
  name: string;
}

interface Extracted {
  vendor_name: string;
  expense_date: string;
  total: string;
  currency_code: string;
  description: string;
  reference_number: string;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'SGD', 'MYR', 'CAD', 'INR', 'AED', 'NZD', 'JPY', 'CHF', 'HKD', 'ZAR'];
const CONFIG_KEY = 'zohexp_cfg';
const DEFAULT_BASE = 'https://expense.zoho.com';

export default function ExpensesPage() {
  const [step, setStep] = useState<Step>('config');
  const [config, setConfig] = useState<Config>({ token: '', orgId: '', baseUrl: DEFAULT_BASE });
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ id: string; number: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore saved config on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Config;
        setConfig(parsed);
        if (parsed.token && parsed.orgId) {
          loadCategories(parsed).then(() => setStep('upload'));
        }
      }
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCategories(cfg: Config) {
    try {
      const resp = await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cfg.token, orgId: cfg.orgId, baseUrl: cfg.baseUrl }),
      });
      const data = (await resp.json()) as { categories: Category[] };
      if (data.categories?.length) {
        setCategories(data.categories);
        setSelectedCategory(data.categories[0].id);
      }
    } catch {
      // non-fatal
    }
  }

  async function handleConnect() {
    if (!config.token.trim() || !config.orgId.trim()) return;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    await loadCategories(config);
    setStep('upload');
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  async function handleExtract() {
    if (!file) return;
    setStep('extracting');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const resp = await fetch('/api/expenses/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mimeType: file.type }),
      });
      const data = (await resp.json()) as Extracted & { error?: string };
      if (!resp.ok || data.error) throw new Error(data.error ?? 'Extraction failed');
      setExtracted(data);
      setStep('reviewing');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to read invoice.');
      setStep('error');
    }
  }

  async function handleSubmit() {
    if (!extracted) return;
    setStep('submitting');
    try {
      const resp = await fetch('/api/expenses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: config.token,
          orgId: config.orgId,
          baseUrl: config.baseUrl,
          expense: { ...extracted, account_id: selectedCategory || undefined },
        }),
      });
      const data = (await resp.json()) as { expense_id?: string; expense_number?: string; error?: string };
      if (!resp.ok || data.error) throw new Error(data.error ?? 'Zoho API error');
      setSuccessInfo({ id: data.expense_id ?? '', number: data.expense_number ?? '' });
      setStep('success');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to create expense.');
      setStep('error');
    }
  }

  function resetToUpload() {
    setFile(null);
    setExtracted(null);
    setErrorMsg('');
    setStep('upload');
  }

  return (
    <>
      <header className="header">
        <div className="header-left">
          <span className="wordmark">Majorform</span>
          <div className="divider-v" />
          <span className="tool-name">Invoice → Zoho Expense</span>
        </div>
        {step !== 'config' && (
          <div className="header-right">
            <button
              className="btn-secondary"
              onClick={() => setConfig((c) => ({ ...c })) || setStep('config')}
            >
              Settings
            </button>
            {step === 'reviewing' || step === 'success' || step === 'error' ? (
              <button className="btn-secondary" onClick={resetToUpload}>
                New Invoice
              </button>
            ) : null}
          </div>
        )}
      </header>

      <div className="setup-panel" style={{ maxWidth: 560 }}>
        {/* ── CONFIG ── */}
        {step === 'config' && (
          <>
            <div className="setup-eyebrow">Setup</div>
            <div className="setup-title">Connect Zoho Expense</div>
            <div className="setup-sub">
              Generate an OAuth 2.0 access token in the Zoho API Console, then paste it below with your Organization ID.
              Credentials are stored locally in your browser.
            </div>
            <div className="field-group">
              <div>
                <div className="field-label">OAuth Access Token</div>
                <input
                  className="field-input"
                  type="password"
                  placeholder="1000.xxxxxxxxxxxx..."
                  value={config.token}
                  onChange={(e) => setConfig((c) => ({ ...c, token: e.target.value }))}
                />
              </div>
              <div>
                <div className="field-label">Organization ID</div>
                <input
                  className="field-input"
                  placeholder="123456789"
                  value={config.orgId}
                  onChange={(e) => setConfig((c) => ({ ...c, orgId: e.target.value }))}
                />
                <div className="field-hint">Zoho Expense → Settings → Organization → Organization ID</div>
              </div>
              <div>
                <div className="field-label">Zoho Region</div>
                <select
                  className="field-input"
                  value={config.baseUrl}
                  onChange={(e) => setConfig((c) => ({ ...c, baseUrl: e.target.value }))}
                >
                  <option value="https://expense.zoho.com">United States</option>
                  <option value="https://expense.zoho.eu">Europe</option>
                  <option value="https://expense.zoho.in">India</option>
                  <option value="https://expense.zoho.com.au">Australia</option>
                </select>
              </div>
            </div>
            <button
              className="btn-primary"
              disabled={!config.token.trim() || !config.orgId.trim()}
              onClick={handleConnect}
            >
              Connect
            </button>
          </>
        )}

        {/* ── UPLOAD ── */}
        {step === 'upload' && (
          <>
            <div className="setup-eyebrow">Upload</div>
            <div className="setup-title">Drop a Receipt or Invoice</div>
            <div className="setup-sub">
              Claude will extract the vendor, date, amount, and description automatically.
              Supports PDF, PNG, and JPG.
            </div>

            <div
              style={{
                border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: '56px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragging ? 'var(--surface)' : 'var(--bg)',
                transition: 'all 0.15s',
                marginBottom: 24,
                userSelect: 'none',
              }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
              />
              {file ? (
                <>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {(file.size / 1024).toFixed(0)} KB · Click to change file
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Drag & drop here
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    PDF · PNG · JPG — or click to browse
                  </div>
                </>
              )}
            </div>

            <button className="btn-primary" disabled={!file} onClick={handleExtract}>
              Extract Details with Claude
            </button>
          </>
        )}

        {/* ── EXTRACTING ── */}
        {step === 'extracting' && (
          <div className="loading-state">
            <div className="spinner" />
            <div className="loading-text">Reading invoice...</div>
            <div className="loading-sub">Claude is extracting vendor, date, amount, and description</div>
          </div>
        )}

        {/* ── REVIEW ── */}
        {step === 'reviewing' && extracted && (
          <>
            <div className="setup-eyebrow">Review</div>
            <div className="setup-title">Confirm Expense Details</div>
            <div className="setup-sub">Edit anything before submitting to Zoho Expense.</div>

            <div className="field-group">
              <div>
                <div className="field-label">Vendor / Merchant</div>
                <input
                  className="field-input"
                  value={extracted.vendor_name}
                  onChange={(e) => setExtracted((x) => x && { ...x, vendor_name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div className="field-label">Date</div>
                  <input
                    className="field-input"
                    type="date"
                    value={extracted.expense_date}
                    onChange={(e) => setExtracted((x) => x && { ...x, expense_date: e.target.value })}
                  />
                </div>
                <div>
                  <div className="field-label">Total Amount</div>
                  <input
                    className="field-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={extracted.total}
                    onChange={(e) => setExtracted((x) => x && { ...x, total: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div className="field-label">Currency</div>
                  <select
                    className="field-input"
                    value={extracted.currency_code}
                    onChange={(e) => setExtracted((x) => x && { ...x, currency_code: e.target.value })}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                {categories.length > 0 && (
                  <div>
                    <div className="field-label">Expense Account</div>
                    <select
                      className="field-input"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <div className="field-label">Description</div>
                <input
                  className="field-input"
                  value={extracted.description}
                  onChange={(e) => setExtracted((x) => x && { ...x, description: e.target.value })}
                />
              </div>

              {extracted.reference_number && (
                <div>
                  <div className="field-label">Invoice / Receipt #</div>
                  <input
                    className="field-input"
                    value={extracted.reference_number}
                    onChange={(e) => setExtracted((x) => x && { ...x, reference_number: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-secondary"
                style={{ flex: '0 0 auto' }}
                onClick={resetToUpload}
              >
                Back
              </button>
              <button
                className="btn-primary"
                disabled={!extracted.total || !extracted.expense_date}
                onClick={handleSubmit}
              >
                Create Expense in Zoho
              </button>
            </div>
          </>
        )}

        {/* ── SUBMITTING ── */}
        {step === 'submitting' && (
          <div className="loading-state">
            <div className="spinner" />
            <div className="loading-text">Creating expense...</div>
            <div className="loading-sub">Submitting to Zoho Expense</div>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === 'success' && (
          <>
            <div style={{ textAlign: 'center', padding: '56px 0 32px' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--green-bg)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  fontSize: 22,
                }}
              >
                ✓
              </div>
              <div className="setup-title" style={{ marginBottom: 8 }}>Expense Created</div>
              <div className="setup-sub" style={{ marginBottom: 0 }}>
                Successfully added to Zoho Expense
                {successInfo?.number && (
                  <>
                    {' — '}
                    <strong style={{ color: 'var(--text-primary)' }}>#{successInfo.number}</strong>
                  </>
                )}
              </div>
            </div>
            <button className="btn-primary" onClick={resetToUpload}>
              Add Another Receipt
            </button>
          </>
        )}

        {/* ── ERROR ── */}
        {step === 'error' && (
          <>
            <div style={{ textAlign: 'center', padding: '56px 0 32px' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--red-bg)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  fontSize: 22,
                  color: 'var(--red)',
                }}
              >
                ✕
              </div>
              <div className="setup-title" style={{ marginBottom: 8 }}>Something went wrong</div>
              <div className="setup-sub" style={{ marginBottom: 0 }}>{errorMsg}</div>
            </div>
            <button
              className="btn-primary"
              onClick={() => setStep(extracted ? 'reviewing' : 'upload')}
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </>
  );
}
