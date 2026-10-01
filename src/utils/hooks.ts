import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
import { useSearchParams } from 'react-router-dom';

/** A string state value mirrored in the URL (`?key=value`) so filters are shareable/deep-linkable. */
export function useQueryParam(key: string, fallback = ''): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? fallback;
  const set = useCallback(
    (v: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v === fallback || v === '') next.delete(key);
          else next.set(key, v);
          return next;
        },
        { replace: true },
      ),
    [key, fallback, setParams],
  );
  return [value, set];
}

type SortValue = string | number;
export type Dir = 'asc' | 'desc';

/** Client-side sorting + pagination for table rows. */
export function usePagedSort<T>(
  rows: T[],
  sorters: Record<string, (row: T) => SortValue>,
  opts: { pageSize?: number; initialKey?: string; initialDir?: Dir; resetKey?: string } = {},
) {
  const { pageSize = 10, initialKey, initialDir = 'asc', resetKey = '' } = opts;
  const [sortKey, setSortKey] = useState<string | undefined>(initialKey);
  const [dir, setDir] = useState<Dir>(initialDir);
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [resetKey]);

  const sorted = useMemo(() => {
    const get = sortKey ? sorters[sortKey] : undefined;
    if (!get) return rows;
    const mult = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const c =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y), undefined, { numeric: true });
      return c * mult;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, dir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: string) => {
    if (key === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setDir('asc');
    }
  };

  return {
    pageRows,
    total: sorted.length,
    sortKey,
    dir,
    toggleSort,
    page: safePage,
    pageCount,
    pageSize,
    setPage,
    sorted,
  };
}

/** Calls `onClose` on outside click or Escape while `open`. */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', click);
      document.removeEventListener('keydown', key);
    };
  }, [ref, open, onClose]);
}
