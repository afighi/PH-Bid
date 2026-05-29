import { supabase } from '../config/supabase';

// Tables exported in FK-safe order (parents before children)
const TABLES = [
  'profiles',
  'projects',
  'bids',
  'contracts',
  'transactions',
  'disputes',
  'reviews',
  'notifications',
  'progress_updates',
  'milestone_approvals',
  'change_orders',
  'bid_negotiations',
  'bid_templates',
  'portfolio_items',
  'project_qa',
  'project_messages',
  'project_documents',
  'shortlists',
  'watchlist',
  'referrals',
  'audit_logs',
];

export async function createBackup(onProgress) {
  const backup = {
    version: '1.0',
    created_at: new Date().toISOString(),
    app: 'BuildBid PH',
    tables: {},
  };

  for (let i = 0; i < TABLES.length; i++) {
    const table = TABLES[i];
    onProgress?.({ table, index: i, total: TABLES.length });

    let all = [];
    let from = 0;
    const PAGE = 1000;

    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(from, from + PAGE - 1);

      if (error) throw new Error(`Failed to read ${table}: ${error.message}`);
      if (!data || data.length === 0) break;
      all = [...all, ...data];
      if (data.length < PAGE) break;
      from += PAGE;
    }

    backup.tables[table] = all;
  }

  return backup;
}

export function downloadBackup(backup) {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href     = url;
  a.download = `buildbid-backup-${ts}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function restoreBackup(backup, onProgress) {
  if (!backup?.version || !backup?.tables) {
    throw new Error('Invalid backup file format.');
  }

  const results = { success: [], failed: [] };

  for (let i = 0; i < TABLES.length; i++) {
    const table = TABLES[i];
    const rows  = backup.tables[table];
    if (!rows || rows.length === 0) continue;

    onProgress?.({ table, index: i, total: TABLES.length, count: rows.length });

    // Upsert in chunks to avoid request size limits
    const CHUNK = 200;
    for (let j = 0; j < rows.length; j += CHUNK) {
      const chunk = rows.slice(j, j + CHUNK);
      const { error } = await supabase
        .from(table)
        .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        results.failed.push({ table, error: error.message });
        break;
      }
    }

    if (!results.failed.find(f => f.table === table)) {
      results.success.push({ table, count: rows.length });
    }
  }

  return results;
}

export function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.json')) {
      return reject(new Error('File must be a .json backup file.'));
    }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch {
        reject(new Error('Invalid JSON file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

export function getBackupSummary(backup) {
  if (!backup?.tables) return null;
  return TABLES.map(t => ({
    table: t,
    count: backup.tables[t]?.length || 0,
  })).filter(r => r.count > 0);
}
