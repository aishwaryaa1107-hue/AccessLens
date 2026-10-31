import { useEffect, useState } from 'react';
import { Activity, Compass, House, MapPinned, Settings2, ShieldAlert, Wifi, WifiOff } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import Brand from './Brand';

const links = [
  { to: '/dashboard', label: 'Home', icon: House },
  { to: '/assist', label: 'Assist', icon: Activity },
  { to: '/report', label: 'Report', icon: ShieldAlert },
  { to: '/map', label: 'Community map', icon: MapPinned },
  { to: '/settings', label: 'Settings', icon: Settings2 }
];

export default function Shell() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  return <div className="app-shell">
    <header className="topbar"><Brand /><nav className="desktop-nav" aria-label="Main navigation">{links.map(({ to, label }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>)}</nav><div className={`network-chip ${online ? '' : 'offline'}`} aria-live="polite">{online ? <Wifi size={15} /> : <WifiOff size={15} />}<span>{online ? 'Online' : 'Offline'}</span></div></header>
    <main className="app-main"><Outlet /></main>
    <nav className="mobile-nav" aria-label="Quick navigation">{links.slice(0, 4).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} aria-label={label} className={({ isActive }) => isActive ? 'mobile-link active' : 'mobile-link'}><Icon size={21} /><span>{label === 'Community map' ? 'Map' : label}</span></NavLink>)}</nav>
    <footer className="app-footer"><span><Compass size={14} /> AccessLens supports awareness. Keep using your cane, guide dog, and established mobility techniques.</span><span>Camera processing stays on this device.</span></footer>
  </div>;
}
