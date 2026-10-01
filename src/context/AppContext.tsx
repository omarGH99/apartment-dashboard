import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import type { AppData, PaymentMethod } from '../types';
import { CURRENT_USER } from '../config';
import { createSeedData } from '../data/seed';
import {
  clearData,
  loadData,
  reducer,
  saveData,
  type NewAnnouncement,
  type NewRequest,
  type NewTenant,
  type NewUnit,
} from './store';
import type { MaintenanceRequest, Tenant, Unit } from '../types';

export type ToastType = 'success' | 'error';
export interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}
type Theme = 'light' | 'dark';

interface AppContextValue extends AppData {
  user: typeof CURRENT_USER;
  today: Dayjs;
  toasts: Toast[];
  theme: Theme;
  showToast: (msg: string, type?: ToastType) => void;
  dismissToast: (id: number) => void;
  toggleTheme: () => void;
  resetDemo: () => void;
  setPaymentStatus: (id: number, status: 'paid' | 'pending', method?: PaymentMethod) => void;
  addMaintenance: (r: NewRequest) => void;
  updateMaintenance: (
    id: number,
    patch: Partial<Pick<MaintenanceRequest, 'status' | 'assignedTo' | 'priority'>>,
  ) => void;
  addAnnouncement: (a: NewAnnouncement) => void;
  updateAnnouncement: (id: number, a: NewAnnouncement) => void;
  deleteAnnouncement: (id: number) => void;
  addUnit: (u: NewUnit) => void;
  updateUnit: (id: number, patch: Partial<Omit<Unit, 'id'>>) => void;
  deleteUnit: (id: number) => void;
  addTenant: (t: NewTenant) => void;
  updateTenant: (id: number, patch: Partial<Omit<Tenant, 'id'>>) => void;
  removeTenant: (id: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export default function AppProvider({ children }: { children: ReactNode }) {
  const today = useMemo(() => dayjs(), []);
  const [data, dispatch] = useReducer(reducer, undefined, () => loadData());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const toastId = useRef(0);

  useEffect(() => saveData(data), [data]);
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const dismissToast = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback(
    (msg: string, type: ToastType = 'success') => {
      const id = ++toastId.current;
      setToasts((t) => [...t.slice(-2), { id, msg, type }]);
      timers.current.set(
        id,
        setTimeout(() => dismissToast(id), 3500),
      );
    },
    [dismissToast],
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem('apt-theme', next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ...data,
      user: CURRENT_USER,
      today,
      toasts,
      theme,
      showToast,
      dismissToast,
      toggleTheme,
      resetDemo: () => {
        clearData();
        dispatch({ type: 'reset', data: createSeedData(dayjs()) });
        showToast('Demo data reset');
      },
      setPaymentStatus: (id, status, method) => {
        dispatch({ type: 'payment/set', id, status, method });
        showToast(status === 'paid' ? 'Payment marked as paid' : 'Payment marked as pending');
      },
      addMaintenance: (request) => {
        dispatch({ type: 'maintenance/add', request });
        showToast('Maintenance request created');
      },
      updateMaintenance: (id, patch) => {
        dispatch({ type: 'maintenance/update', id, patch });
        showToast('Maintenance request updated');
      },
      addAnnouncement: (item) => {
        dispatch({ type: 'announcement/add', item, author: CURRENT_USER.name });
        showToast('Announcement posted');
      },
      updateAnnouncement: (id, item) => {
        dispatch({ type: 'announcement/update', id, item });
        showToast('Announcement updated');
      },
      deleteAnnouncement: (id) => {
        dispatch({ type: 'announcement/delete', id });
        showToast('Announcement deleted');
      },
      addUnit: (unit) => {
        dispatch({ type: 'unit/add', unit });
        showToast(`Unit ${unit.number} added`);
      },
      updateUnit: (id, patch) => {
        dispatch({ type: 'unit/update', id, patch });
        showToast('Unit updated');
      },
      deleteUnit: (id) => {
        dispatch({ type: 'unit/delete', id });
        showToast('Unit deleted');
      },
      addTenant: (tenant) => {
        dispatch({ type: 'tenant/add', tenant });
        showToast(`${tenant.name} added`);
      },
      updateTenant: (id, patch) => {
        dispatch({ type: 'tenant/update', id, patch });
        showToast('Tenant updated');
      },
      removeTenant: (id) => {
        dispatch({ type: 'tenant/remove', id });
        showToast('Tenancy ended, unit is now vacant');
      },
    }),
    [data, today, toasts, theme, showToast, dismissToast, toggleTheme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
