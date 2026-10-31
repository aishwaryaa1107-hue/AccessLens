import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell';
import OpeningSequence from './components/OpeningSequence';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import { syncQueuedReports } from './services/reports';
import { readPreferences } from './services/preferences';

const Onboarding = lazy(() => import('./pages/Onboarding'));
const LiveAssistance = lazy(() => import('./pages/LiveAssistance'));
const ReportHazard = lazy(() => import('./pages/ReportHazard'));
const HazardMap = lazy(() => import('./pages/HazardMap'));
const Settings = lazy(() => import('./pages/Settings'));

export default function App() {
  const initialPrefs = readPreferences();
  useEffect(() => { document.documentElement.classList.toggle('large-text', initialPrefs.largeText); document.documentElement.classList.toggle('high-contrast', initialPrefs.highContrast); }, []);
  useEffect(() => {
    const update = () => { if (navigator.onLine) void syncQueuedReports(); };
    window.addEventListener('online', update);
    if (navigator.onLine) void syncQueuedReports();
    return () => { window.removeEventListener('online', update); };
  }, []);
  return <>
    <OpeningSequence />
    <div className={document.documentElement.classList.contains('large-text') ? 'large-text' : ''} data-network={navigator.onLine ? 'online' : 'offline'}>
    <Suspense fallback={<div className="boot-screen" role="status">Loading AccessLens…</div>}><Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<Shell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assist" element={<LiveAssistance />} />
        <Route path="/report" element={<ReportHazard />} />
        <Route path="/map" element={<HazardMap />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes></Suspense>
    </div>
  </>;
}
