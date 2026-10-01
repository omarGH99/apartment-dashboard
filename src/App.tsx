import { lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import AppProvider from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Toasts from './components/Toasts';
import Units from './pages/Units';
import Tenants from './pages/Tenants';
import Payments from './pages/Payments';
import Maintenance from './pages/Maintenance';
import Announcements from './pages/Announcements';
import NotFound from './pages/NotFound';

// The two chart-heavy pages are split out so Recharts doesn't block first paint of other routes.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reports = lazy(() => import('./pages/Reports'));

/** HashRouter keeps deep links working on static hosts such as GitHub Pages. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="units" element={<Units />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="payments" element={<Payments />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
        <Toasts />
      </AppProvider>
    </ErrorBoundary>
  );
}
