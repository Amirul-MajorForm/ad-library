'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type Step =
  | 'config_creds'   // enter client ID, secret, org ID
  | 'config_code'    // enter grant code from API console
  | 'upload'
  | 'extracting'
  | 'reviewing'
  | 'submitting'
  | 'success'
  | 'error';

interface StoredConfig {
  clientId: string;
  clientSecret: string;
  orgId: string;
  baseUrl: string;
  refreshToken: string;
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
const CONFIG_KEY = 'zohexp_cfg_v2';
const DEFAULT_BASE = 'https://expense.zoho.com';

async function getAccessToken(cfg: StoredConfig): Promise<string> {
  const resp = await fetch('/api/expenses/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grantType: 'refresh_token',
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
      refreshToken: cfg.refreshToken,
      baseUrl: cfg.baseUrl,
    }),
  });
  const data = await resp.json() as { accessToken?: string; error?: string };
  if (!data.accessToken) throw new Error(data.error ?? 'Could not refresh access token');
  return data.accessToken;
}

export default function ExpensesPage() {
  const [step, setStep] = useState<Step>('config_creds');
  const [creds, setCreds] = useState({ clientId: '', clientSecret: '', orgId: '', baseUrl: DEFAULT_BASE });
  const [grantCode, setGrantCode] = useState('');
  const [config, setConfig] = useState<StoredConfig | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ id: string; number: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as StoredConfig;
        setConfig(parsed);
        loadCategories(parsed).then(() => setStep('upload'));
      }
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCategories(cfg: StoredConfig) {
    try {
      const token = await getAccessToken(cfg);
      const resp = await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, orgId: cfg.orgId, baseUrl: cfg.baseUrl }),
      });
      const data = await resp.json() as { categories: Category[] };
      if (data.categories?.length) {
        setCategories(data.categories);
        setSelectedCategory(data.categories[0].id);
      }
    } catch {
      // non-fatal
    }
  }

  async function handleExchangeCode() {
    if (!grantCode.trim()) return;
    setConnecting(true);
    try {
      const resp = await fetch('/api/expenses/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantType: 'authorization_code',
          clientId: creds.clientId,
          clientSecret: creds.clientSecret,
          code: grantCode.trim(),
          baseUrl: creds.baseUrl,
        }),
      });
      const data = await resp.json() as { accessToken?: string; refreshToken?: string; error?: string };
      if (!data.accessToken || !data.refreshToken) throw new Error(data.error ?? 'Token exchange failed. Make sure the grant code is fresh (< 3 min).');

      const newConfig: StoredConfig = {
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        orgId: creds.orgId,
        baseUrl: creds.baseUrl,
        refreshToken: data.refreshToken,
      };
      localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);

      // Load categories with fresh access token
      try {
        const tokenResp = await fetch('/api/expenses/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: data.accessToken, orgId: creds.orgId, baseUrl: creds.baseUrl }),
        });
        const catData = await tokenResp.json() as { categories: Category[] };
        if (catData.categories?.length) {
          setCategories(catData.categories);
          setSelectedCategory(catData.categories[0].id);
        }
      } catch {
        // non-fatal
      }

      setStep('upload');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Connection failed');
      setStep('error');
    } finally {
      setConnecting(false);
    }
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
      const data = await resp.json() as Extracted & { error?: string };
      if (!resp.ok || data.error) throw new Error(data.error ?? 'Extraction failed');
      setExtracted(data);
      setStep('reviewing');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to read invoice.');
      setStep('error');
    }
  }

  async function handleSubmit() {
    if (!extracted || !config) return;
    setStep('submitting');
    try {
      const token = await getAccessToken(config);
      const resp = await fetch('/api/expenses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          orgId: config.orgId,
          baseUrl: config.baseUrl,
          expense: { ...extracted, account_id: selectedCategory || undefined },
        }),
      });
      const data = await resp.json() as { expense_id?: string; expense_number?: string; error?: string };
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

  function disconnectAndReset() {
    localStorage.removeItem(CONFIG_KEY);
    setConfig(null);
    setCategories([]);
    setSelectedCategory('');
    setCreds({ clientId: '', clientSecret: '', orgId: '', baseUrl: DEFAULT_BASE });
    setGrantCode('');
    setFile(null);
    setExtracted(null);
    setStep('config_creds');
  }

  const scopeString = 'ZohoExpense.fullaccess.all';

  return (
    <>
      <header className="header">
        <div className="header-left">
          <span className="wordmark">Majorform</span>
          <div className="divider-v" />
          <span className="tool-name">Invoice → Zoho Expense</span>
        </div>
        {step !== 'config_creds' && step !== 'config_code' && (
          <div className="header-right">
            <button className="btn-secondary" onClick={disconnectAndReset}>Reconnect</button>
            {(step === 'reviewing' || step === 'success' || step === 'error') && (
              <button className="btn-secondary" onClick={resetToUpload}>New Invoice</button>
            )}
          </div>
        )}
      </header>

      <div className="setup-panel" style={{ maxWidth: 560 }}>

        {/* ── STEP 1: CLIENT CREDS ── */}
        {step === 'config_creds' && (
          <>
            <div className="setup-eyebrow">Setup — Step 1 of 2</div>
            <div className="setup-title">Zoho API Credentials</div>
            <div className="setup-sub">
              You can see your Client ID and Client Secret in the <strong>Client Secret</strong> tab of your Self Client app in the Zoho API Console.
            </div>
            <div className="field-group">
              <div>
                <div className="field-label">Client ID</div>
                <input
                  className="field-input"
                  placeholder="1000.MX6EFBFEUKP77VPEEXYUNZDZOC..."
                  value={creds.clientId}
                  onChange={(e) => setCreds((c) => ({ ...c, clientId: e.target.value }))}
                />
              </div>
              <div>
                <div className="field-label">Client Secret</div>
                <input
                  className="field-input"
                  type="password"
                  placeholder="f392584aea2d17e7ac5783117bfc94a469f722..."
                  value={creds.clientSecret}
                  onChange={(e) => setCreds((c) => ({ ...c, clientSecret: e.target.value }))}
                />
              </div>
              <div>
                <div className="field-label">Organization ID</div>
                <input
                  className="field-input"
                  placeholder="123456789"
                  value={creds.orgId}
                  onChange={(e) => setCreds((c) => ({ ...c, orgId: e.target.value }))}
                />
                <div className="field-hint">Zoho Expense → Settings → Organization → Organization ID</div>
              </div>
              <div>
                <div className="field-label">Zoho Region</div>
                <select
                  className="field-input"
                  value={creds.baseUrl}
                  onChange={(e) => setCreds((c) => ({ ...c, baseUrl: e.target.value }))}
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
              disabled={!creds.clientId.trim() || !creds.clientSecret.trim() || !creds.orgId.trim()}
              onClick={() => setStep('config_code')}
            >
              Next →
            </button>
          </>
        )}

        {/* ── STEP 2: GRANT CODE ── */}
        {step === 'config_code' && (
          <>
            <div className="setup-eyebrow">Setup — Step 2 of 2</div>
            <div className="setup-title">Generate a Grant Code</div>
            <div className="setup-sub">
              Go back to the <strong>Generate Code</strong> tab in the Zoho API Console and do the following:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {[
                { n: 1, text: <>In the <strong>Scope</strong> field, type exactly:</> },
                { n: 2, text: <>Leave <strong>Code expiry duration</strong> as 3 minutes</> },
                { n: 3, text: <>Click <strong>CREATE</strong> — a code will appear</> },
                { n: 4, text: <>Paste that code below and click Connect <em>(within 3 minutes)</em></> },
              ].map(({ n, text }) => (
                <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff',
                    fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                  }}>{n}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{text}</div>
                </div>
              ))}
            </div>

            {/* Scope copy box */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
              padding: '10px 14px', fontFamily: 'monospace', fontSize: 12,
              color: 'var(--text-primary)', marginBottom: 24, wordBreak: 'break-all',
            }}>
              {scopeString}
            </div>

            <div className="field-group">
              <div>
                <div className="field-label">Grant Code</div>
                <input
                  className="field-input"
                  placeholder="1000.xxxxxxxxxxxxxxxx..."
                  value={grantCode}
                  onChange={(e) => setGrantCode(e.target.value)}
                  autoComplete="off"
                />
                <div className="field-hint">Code expires in 3 minutes — connect immediately after generating</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" style={{ flex: '0 0 auto' }} onClick={() => setStep('config_creds')}>
                Back
              </button>
              <button
                className="btn-primary"
                disabled={!grantCode.trim() || connecting}
                onClick={handleExchangeCode}
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{(file.size / 1024).toFixed(0)} KB · Click to change file</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Drag & drop here</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>PDF · PNG · JPG — or click to browse</div>
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
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
              <button className="btn-secondary" style={{ flex: '0 0 auto' }} onClick={resetToUpload}>Back</button>
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
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: 'var(--green-bg)',
                border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 20px', fontSize: 22, color: 'var(--green)',
              }}>✓</div>
              <div className="setup-title" style={{ marginBottom: 8 }}>Expense Created</div>
              <div className="setup-sub" style={{ marginBottom: 0 }}>
                Successfully added to Zoho Expense
                {successInfo?.number && <> — <strong style={{ color: 'var(--text-primary)' }}>#{successInfo.number}</strong></>}
              </div>
            </div>
            <button className="btn-primary" onClick={resetToUpload}>Add Another Receipt</button>
          </>
        )}

        {/* ── ERROR ── */}
        {step === 'error' && (
          <>
            <div style={{ textAlign: 'center', padding: '56px 0 32px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: 'var(--red-bg)',
                border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 20px', fontSize: 22, color: 'var(--red)',
              }}>✕</div>
              <div className="setup-title" style={{ marginBottom: 8 }}>Something went wrong</div>
              <div className="setup-sub" style={{ marginBottom: 0 }}>{errorMsg}</div>
            </div>
            <button className="btn-primary" onClick={() => setStep(config ? (extracted ? 'reviewing' : 'upload') : 'config_creds')}>
              Try Again
            </button>
          </>
        )}

      </div>
    </>
  );
}
