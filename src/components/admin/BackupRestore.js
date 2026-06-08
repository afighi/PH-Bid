import { useState, useRef } from 'react';
import { Database, Upload, Download, CheckCircle2, AlertTriangle, X, RefreshCw, ShieldAlert } from 'lucide-react';
import { COLORS, S } from '../../theme';
import {
  createBackup, downloadBackup, restoreBackup, parseBackupFile, getBackupSummary,
} from '../../services/backupService';

function ProgressBar({ value, max, label }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color: COLORS.text, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 8, backgroundColor: COLORS.gray50, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 8, backgroundColor: COLORS.primary, width: `${pct}%`, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

function TableRow({ table, count, status }) {
  const color = status === 'ok' ? COLORS.success : status === 'fail' ? COLORS.danger : COLORS.textMuted;
  const icon  = status === 'ok' ? '✓' : status === 'fail' ? '✗' : '·';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', borderRadius: 8, backgroundColor: status === 'ok' ? `${COLORS.success}08` : status === 'fail' ? `${COLORS.danger}08` : 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color, width: 14, textAlign: 'center' }}>{icon}</span>
        <span style={{ fontSize: 12, color: COLORS.text, fontFamily: 'monospace' }}>{table}</span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted }}>{count.toLocaleString()} rows</span>
    </div>
  );
}

/* ── Confirm restore modal ──────────────────────────────────────── */
function ConfirmModal({ backup, onConfirm, onCancel }) {
  const summary = getBackupSummary(backup);
  const totalRows = summary?.reduce((s, r) => s + r.count, 0) || 0;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ backgroundColor: '#FFF', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.danger, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={10} />Confirm Restore</div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: COLORS.text }}>This will overwrite existing data</h2>
          </div>
          <button onClick={onCancel} style={{ width: 32, height: 32, border: `1px solid ${COLORS.border}`, borderRadius: 8, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ backgroundColor: `${COLORS.danger}0D`, border: `1px solid ${COLORS.danger}33`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10 }}>
            <ShieldAlert size={16} color={COLORS.danger} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: COLORS.danger, margin: 0, lineHeight: 1.6 }}>
              Restoring will <strong>upsert all records</strong> from this backup. Existing rows with matching IDs will be overwritten. This cannot be undone.
            </p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Backup Info</div>
            {[
              ['Created', new Date(backup.created_at).toLocaleString('en-PH')],
              ['Version', backup.version],
              ['Tables', summary?.length],
              ['Total Rows', totalRows.toLocaleString()],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${COLORS.border}`, fontSize: 13 }}>
                <span style={{ color: COLORS.textMuted, fontWeight: 600 }}>{l}</span>
                <span style={{ color: COLORS.text, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Tables to restore</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {summary?.map(r => <TableRow key={r.table} table={r.table} count={r.count} />)}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ ...S.btnSecondary, flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, border: 'none', borderRadius: 10, padding: '10px 0', backgroundColor: COLORS.danger, color: '#FFF', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Yes, Restore
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function BackupRestore() {
  const fileInputRef = useRef(null);

  // Backup state
  const [backupState,    setBackupState]    = useState('idle'); // idle | running | done | error
  const [backupProgress, setBackupProgress] = useState(null);
  const [backupError,    setBackupError]    = useState('');
  const [lastBackup,     setLastBackup]     = useState(null);

  // Restore state
  const [restoreFile,    setRestoreFile]    = useState(null);
  const [parsedBackup,   setParsedBackup]   = useState(null);
  const [parseError,     setParseError]     = useState('');
  const [showConfirm,    setShowConfirm]    = useState(false);
  const [restoreState,   setRestoreState]   = useState('idle'); // idle | running | done | error
  const [restoreProgress, setRestoreProgress] = useState(null);
  const [restoreResults,  setRestoreResults]  = useState(null);

  /* ── Backup ── */
  const handleBackup = async () => {
    setBackupState('running');
    setBackupProgress(null);
    setBackupError('');
    try {
      const backup = await createBackup(p => setBackupProgress(p));
      downloadBackup(backup);
      setLastBackup({ at: new Date(), tableCount: Object.keys(backup.tables).length, rowCount: Object.values(backup.tables).reduce((s, r) => s + r.length, 0) });
      setBackupState('done');
    } catch (err) {
      setBackupError(err.message);
      setBackupState('error');
    }
  };

  /* ── File pick ── */
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRestoreFile(file);
    setParsedBackup(null);
    setParseError('');
    setRestoreState('idle');
    setRestoreResults(null);
    try {
      const data = await parseBackupFile(file);
      setParsedBackup(data);
    } catch (err) {
      setParseError(err.message);
    }
    e.target.value = '';
  };

  /* ── Restore ── */
  const handleRestore = async () => {
    setShowConfirm(false);
    setRestoreState('running');
    setRestoreProgress(null);
    setRestoreResults(null);
    try {
      const results = await restoreBackup(parsedBackup, p => setRestoreProgress(p));
      setRestoreResults(results);
      setRestoreState(results.failed.length === 0 ? 'done' : 'error');
    } catch (err) {
      setRestoreResults({ failed: [{ table: 'unknown', error: err.message }], success: [] });
      setRestoreState('error');
    }
  };

  const CARD = { backgroundColor: '#FFF', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', padding: 28 };

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          backup={parsedBackup}
          onConfirm={handleRestore}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* ══ BACKUP ══ */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${COLORS.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Download size={20} color={COLORS.primary} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: COLORS.text }}>Create Backup</h3>
              <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>Export all tables to a JSON file</p>
            </div>
          </div>

          <div style={{ backgroundColor: COLORS.gray50, borderRadius: 10, border: `1px solid ${COLORS.border}`, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.7 }}>
            Exports all 21 database tables into a single <code style={{ backgroundColor: '#E2E8F0', padding: '1px 5px', borderRadius: 4 }}>.json</code> file. The backup includes every row your admin account can read. Store it securely.
          </div>

          {backupState === 'running' && backupProgress && (
            <div style={{ marginBottom: 20 }}>
              <ProgressBar value={backupProgress.index + 1} max={backupProgress.total} label={`Reading ${backupProgress.table}…`} />
            </div>
          )}

          {backupState === 'done' && lastBackup && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: `${COLORS.success}0F`, border: `1px solid ${COLORS.success}33`, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <CheckCircle2 size={15} color={COLORS.success} />
              <span style={{ fontSize: 12, color: COLORS.success, fontWeight: 600 }}>
                Downloaded — {lastBackup.tableCount} tables, {lastBackup.rowCount.toLocaleString()} rows
              </span>
            </div>
          )}

          {backupState === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: `${COLORS.danger}0F`, border: `1px solid ${COLORS.danger}33`, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <AlertTriangle size={15} color={COLORS.danger} />
              <span style={{ fontSize: 12, color: COLORS.danger, fontWeight: 600 }}>{backupError}</span>
            </div>
          )}

          <button
            onClick={handleBackup}
            disabled={backupState === 'running'}
            style={{ ...S.btnPrimary, width: '100%', justifyContent: 'center', opacity: backupState === 'running' ? 0.6 : 1, cursor: backupState === 'running' ? 'not-allowed' : 'pointer' }}
          >
            {backupState === 'running'
              ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Backing up…</>
              : <><Download size={14} /> {backupState === 'done' ? 'Download Again' : 'Download Backup'}</>
            }
          </button>
        </div>

        {/* ══ RESTORE ══ */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${COLORS.warning}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={20} color={COLORS.warning} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: COLORS.text }}>Restore Backup</h3>
              <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>Upload a backup file to restore data</p>
            </div>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ border: `2px dashed ${restoreFile ? COLORS.primary : COLORS.border}`, borderRadius: 12, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, backgroundColor: restoreFile ? `${COLORS.primary}06` : COLORS.gray50, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.backgroundColor = `${COLORS.primary}06`; }}
            onMouseLeave={e => { if (!restoreFile) { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.backgroundColor = COLORS.gray50; } }}
          >
            <Database size={28} color={restoreFile ? COLORS.primary : COLORS.textLight} style={{ marginBottom: 8 }} />
            {restoreFile ? (
              <>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: COLORS.primary }}>{restoreFile.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: COLORS.textMuted }}>
                  {(restoreFile.size / 1024).toFixed(1)} KB · Click to change
                </p>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: COLORS.text }}>Click to select backup file</p>
                <p style={{ margin: 0, fontSize: 11, color: COLORS.textMuted }}>Accepts .json files exported from this app</p>
              </>
            )}
          </div>

          {parseError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: `${COLORS.danger}0F`, border: `1px solid ${COLORS.danger}33`, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
              <AlertTriangle size={14} color={COLORS.danger} />
              <span style={{ fontSize: 12, color: COLORS.danger, fontWeight: 600 }}>{parseError}</span>
            </div>
          )}

          {parsedBackup && !parseError && (
            <div style={{ backgroundColor: COLORS.gray50, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>Backup Preview</div>
              {[
                ['Created', new Date(parsedBackup.created_at).toLocaleString('en-PH')],
                ['Tables', getBackupSummary(parsedBackup)?.length],
                ['Total Rows', getBackupSummary(parsedBackup)?.reduce((s, r) => s + r.count, 0).toLocaleString()],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.textMuted, padding: '2px 0' }}>
                  <span>{l}</span><strong style={{ color: COLORS.text }}>{v}</strong>
                </div>
              ))}
            </div>
          )}

          {restoreState === 'running' && restoreProgress && (
            <div style={{ marginBottom: 12 }}>
              <ProgressBar value={restoreProgress.index + 1} max={restoreProgress.total} label={`Restoring ${restoreProgress.table} (${restoreProgress.count} rows)…`} />
            </div>
          )}

          {restoreState === 'done' && restoreResults && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: `${COLORS.success}0F`, border: `1px solid ${COLORS.success}33`, borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                <CheckCircle2 size={15} color={COLORS.success} />
                <span style={{ fontSize: 12, color: COLORS.success, fontWeight: 600 }}>
                  Restored {restoreResults.success.length} tables successfully
                </span>
              </div>
              <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {restoreResults.success.map(r => <TableRow key={r.table} table={r.table} count={r.count} status="ok" />)}
              </div>
            </div>
          )}

          {restoreState === 'error' && restoreResults && (
            <div style={{ marginBottom: 12 }}>
              {restoreResults.failed.map(f => (
                <div key={f.table} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, backgroundColor: `${COLORS.danger}0F`, border: `1px solid ${COLORS.danger}33`, borderRadius: 10, padding: '10px 14px', marginBottom: 6 }}>
                  <AlertTriangle size={14} color={COLORS.danger} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: COLORS.danger, fontWeight: 600 }}>{f.table}: {f.error}</span>
                </div>
              ))}
              {restoreResults.success.length > 0 && (
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
                  {restoreResults.success.length} table(s) restored successfully before error.
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShowConfirm(true)}
            disabled={!parsedBackup || restoreState === 'running'}
            style={{ width: '100%', border: 'none', borderRadius: 10, padding: '10px 0', backgroundColor: !parsedBackup || restoreState === 'running' ? COLORS.border : COLORS.warning, color: !parsedBackup || restoreState === 'running' ? COLORS.textMuted : '#FFF', fontWeight: 700, fontSize: 13, cursor: !parsedBackup || restoreState === 'running' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background 0.2s' }}
          >
            {restoreState === 'running'
              ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Restoring…</>
              : <><Upload size={14} /> Restore from Backup</>
            }
          </button>
        </div>
      </div>
    </>
  );
}
