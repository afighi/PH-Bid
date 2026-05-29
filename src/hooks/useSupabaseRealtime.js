import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';

/**
 * Lightweight hook: calls `refetchFn` whenever a row in `table` changes.
 * Use this when a component already has its own complex fetch logic and you
 * just want it to re-run on any relevant table change.
 *
 * @param {string|string[]} tables  - table name or array of table names to watch
 * @param {function}        refetch - the function to call on any change
 * @param {string}          filter  - optional filter e.g. "project_id=eq.uuid"
 * @param {any[]}           deps    - extra deps that should re-subscribe
 */
export function useRealtimeQuery(tables, refetch, filter = null, deps = []) {
  const refetchRef  = useRef(refetch);
  refetchRef.current = refetch;

  // Stable string key so inline array literals don't cause infinite re-subscriptions
  const tablesKey = Array.isArray(tables) ? tables.join(',') : tables;

  useEffect(() => {
    const tableList = tablesKey.split(',');
    const channels  = tableList.map((table, i) => {
      const cfg = { event: '*', schema: 'public', table: table.trim() };
      if (filter) cfg.filter = filter;
      return supabase
        .channel(`rq-${table}-${filter || 'all'}-${deps.join('-')}-${i}`)
        .on('postgres_changes', cfg, () => refetchRef.current())
        .subscribe();
    });
    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesKey, filter, ...deps]);
}

/**
 * Generic real-time hook for Supabase tables.
 * Uses fetchFn for initial load (supports complex queries with joins),
 * then subscribes to postgres_changes and refetches on any change.
 *
 * @param {string}   table    - Supabase table name
 * @param {function} fetchFn  - async function that returns the data array
 * @param {string}   filter   - optional Supabase filter string, e.g. "contractor_id=eq.uuid"
 * @param {any[]}    deps     - extra deps that should re-subscribe (e.g. [userId])
 */
export function useSupabaseRealtime(table, fetchFn, filter = null, deps = []) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const load = useCallback(async () => {
    try {
      const result = await fetchRef.current();
      setData(result || []);
    } catch (e) {
      console.error(`useSupabaseRealtime [${table}]:`, e);
    } finally {
      setLoading(false);
    }
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [table, ...deps]);

  useEffect(() => {
    setLoading(true);
    load();

    const channelName = `rt-${table}-${filter || 'all'}-${deps.join('-')}`;
    const config = { event: '*', schema: 'public', table };
    if (filter) config.filter = filter;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', config, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load, table, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, refetch: load, setData };
}
