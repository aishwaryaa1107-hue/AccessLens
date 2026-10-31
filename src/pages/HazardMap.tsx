import { useEffect, useMemo, useState } from 'react';
import { divIcon } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { AlertTriangle, ArrowUpRight, Crosshair, Download, List, Map as MapIcon, MapPin, Search, ShieldCheck, SlidersHorizontal, Sparkles, WifiOff, X } from 'lucide-react';
import { demoReports, DEMO_MAP_CENTER, downloadDemoDataset } from '../data/demoReports';
import { fetchCommunityReports, reportStillPresent } from '../services/reports';
import { locateUser } from '../services/location';
import { backendConfigured } from '../services/supabase';
import type { HazardCategory, HazardReport, ReportStatus } from '../types';
import type { FormEvent } from 'react';

const categoryLabels: Record<HazardCategory, string> = { broken_footpath: 'Broken footpath', open_drain: 'Open drain', construction: 'Construction work', blocked_footpath: 'Blocked footpath', parked_vehicle: 'Parked vehicle obstruction', unsafe_crossing: 'Unsafe crossing', damaged_steps: 'Damaged steps', missing_ramp: 'Missing ramp', other: 'Other' };
const statusLabels: Record<ReportStatus, string> = { pending: 'Pending verification', verified: 'Verified', resolved: 'Resolved', rejected: 'Rejected' };
const statusColors: Record<ReportStatus, string> = { pending: '#d99238', verified: '#248d78', resolved: '#70818d', rejected: '#bd564f' };
const categoryOptions = Object.entries(categoryLabels) as [HazardCategory, string][];

function createHazardIcon(report: HazardReport) {
  return divIcon({
    className: 'hazard-marker-host',
    html: `<span class="hazard-marker marker-${report.status}${report.is_demo ? ' marker-demo' : ''}" aria-hidden="true"><span class="hazard-marker-pulse"></span><span class="hazard-marker-core"></span></span>`,
    iconSize: [34, 42], iconAnchor: [17, 38], popupAnchor: [0, -34]
  });
}

export default function HazardMap() {
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');
  const [dataMode, setDataMode] = useState<'demo' | 'community' | 'cached'>(backendConfigured ? 'community' : 'demo');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'map' | 'list'>('map');
  const [notice, setNotice] = useState('');
  const [centre, setCentre] = useState<[number, number]>(() => backendConfigured ? [20, 0] : DEMO_MAP_CENTER);
  const [zoom, setZoom] = useState(() => backendConfigured ? 2 : 13);

  const reload = async () => {
    setLoading(true);
    setFailure('');
    try {
      const communityReports = await fetchCommunityReports();
      if (!backendConfigured && communityReports.length === 0) {
        setReports(demoReports);
        setDataMode('demo');
      } else {
        setReports(communityReports);
        setDataMode(backendConfigured ? 'community' : 'cached');
      }
    } catch {
      setFailure('Could not load community reports. Showing cached reports when available.');
      if (!backendConfigured) {
        setReports(demoReports);
        setDataMode('demo');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  const filtered = useMemo(() => reports.filter((report) =>
    (category === 'all' || report.category === category) &&
    (status === 'all' || report.status === status) &&
    (!query.trim() || `${report.description} ${report.notes || ''} ${categoryLabels[report.category]}`.toLowerCase().includes(query.trim().toLowerCase()))
  ), [reports, category, status, query]);

  const markerIcons = useMemo(() => new Map(reports.map((report) => [report.id, createHazardIcon(report)] as const)), [reports]);

  const useLocation = async () => {
    setNotice('');
    try {
      const position = await locateUser();
      setCentre([position.latitude, position.longitude]);
      setZoom(14);
      setNotice(`Map centered on your location (GPS accuracy about ${Math.round(position.accuracy)} m).`);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Location unavailable. You can still browse the sample map.');
    }
  };

  const searchPlaceOrReports = async (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 3) { setNotice('Type at least three letters to search reports or places.'); return; }

    const matchingReports = reports.filter((report) => `${report.description} ${report.notes || ''} ${categoryLabels[report.category]}`.toLowerCase().includes(term.toLowerCase()));
    if (matchingReports.length) {
      setNotice(`${matchingReports.length} ${dataMode === 'demo' ? 'fictional sample ' : ''}report${matchingReports.length === 1 ? '' : 's'} match “${term}”.`);
      return;
    }

    setNotice('Searching OpenStreetMap places…');
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(term)}`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Place search failed.');
      const places = await response.json() as { lat: string; lon: string; display_name: string }[];
      if (!places.length) throw new Error('No matching place found.');
      setCentre([Number(places[0].lat), Number(places[0].lon)]);
      setZoom(13);
      setQuery('');
      setNotice(`Map centered on ${places[0].display_name.split(',').slice(0, 2).join(',')}.`);
    } catch {
      setNotice('Place search is unavailable. Try a hazard category or description instead.');
    }
  };

  const stillPresent = async (report: HazardReport) => {
    if (report.is_demo) return;
    const saved = await reportStillPresent(report.id);
    setNotice(saved ? 'Thanks. Your “still present” update was recorded.' : 'Status updates need an online Supabase connection.');
  };

  return <div className="page-wrap map-page">
    <div className="page-heading">
      <div><div className="eyebrow muted-eyebrow">SHARED ACCESS INFORMATION</div><h1>Community hazard map</h1><p>{dataMode === 'demo' ? 'Explore fictional sample reports and try the map filters.' : 'Explore reports from the community. Pending reports are unverified and may be outdated.'}</p></div>
      <div className="map-report-count"><MapPin size={17} /><b>{filtered.length}</b><span>{dataMode === 'demo' ? 'sample reports' : filtered.length === 1 ? 'report' : 'reports'}</span></div>
    </div>

    {dataMode === 'demo' && <div className="integration-banner demo-data-banner" role="note">
      <Sparkles size={18} /><span><b>Fictional demo data</b> — these sample reports are for testing the map only. They are not real hazards or safety information.</span>
      <button className="button button-outline button-small demo-download" type="button" onClick={downloadDemoDataset}><Download size={15} /> Download JSON</button>
    </div>}
    {dataMode === 'cached' && <div className="integration-banner" role="note"><WifiOff size={18} /><span>Showing reports cached on this device. They may not be current or verified.</span></div>}
    {backendConfigured && reports.length === 0 && !loading && <div className="integration-banner"><AlertTriangle size={18} /><span>No community reports yet. Submit a report to populate this map.</span></div>}
    {!navigator.onLine && <div className="integration-banner offline-banner"><WifiOff size={18} /><span>Offline view. Cached map tiles and reports may be available on this device.</span></div>}

    <section className="map-tools">
      <form className="map-search" onSubmit={(event) => void searchPlaceOrReports(event)}><Search size={18} /><input aria-label="Search reports or a place" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports or places…" />{query && <button className="search-clear" type="button" aria-label="Clear search" onClick={() => { setQuery(''); setNotice('Search cleared.'); }}><X size={15} /></button>}<button aria-label="Search reports or OpenStreetMap places" type="submit"><ArrowUpRight size={17} /></button></form>
      <button type="button" className="button button-outline location-button" onClick={() => void useLocation()}><Crosshair size={17} /> My location</button>
      <label className="filter-select"><SlidersHorizontal size={16} /><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="pending">Pending review</option><option value="verified">Verified</option><option value="resolved">Resolved</option></select></label>
      <label className="filter-select"><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="view-switch" role="group" aria-label="Map or list view"><button type="button" className={view === 'map' ? 'selected' : ''} onClick={() => setView('map')} aria-label="Map view"><MapIcon size={17} /></button><button type="button" className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')} aria-label="List view"><List size={17} /></button></div>
    </section>

    {notice && <div className="map-notice" role="status">{notice}</div>}
    {failure && <div className="map-notice map-failure" role="status">{failure}</div>}

    <div className={`map-content ${view === 'list' ? 'list-mode' : ''}`}>
      {view === 'map' ? <div className="leaflet-frame">
        <MapContainer center={centre} zoom={zoom} scrollWheelZoom className="leaflet-map"><MapRecenter centre={centre} zoom={zoom} /><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {filtered.map((report) => report.latitude != null && report.longitude != null ? <Marker key={report.id} position={[report.latitude, report.longitude]} icon={markerIcons.get(report.id)!}>
            <Popup><div className={`map-popup ${report.is_demo ? 'map-popup-demo' : ''}`}>
              {report.is_demo && <span className="demo-data-badge">DEMO ONLY · FICTIONAL</span>}
              <span className={`status-pill status-${report.status}`}>{statusLabels[report.status]}</span>
              <b>{categoryLabels[report.category]}</b><p>{report.description}</p>
              {report.notes && <small>{report.notes}</small>}
              <small>{new Date(report.created_at).toLocaleDateString()}</small>
              {!report.is_demo && <div className="popup-actions"><button type="button" onClick={() => void stillPresent(report)}>Still present</button></div>}
            </div></Popup>
          </Marker> : null)}
        </MapContainer>
        <div className="map-legend"><b>Status</b>{(['pending', 'verified', 'resolved'] as ReportStatus[]).map((item) => <span key={item}><i style={{ backgroundColor: statusColors[item] }} />{statusLabels[item]}</span>)}{dataMode === 'demo' && <span className="legend-demo-note">Pulsing pins are fictional samples</span>}</div>
        {!filtered.length && !loading && <div className="map-empty-overlay"><span><MapPin size={21} /></span><b>{reports.length ? 'No reports match these filters' : 'No community reports yet'}</b><small>{reports.length ? 'Clear or change a filter to see more results.' : 'Reports will appear when available.'}</small></div>}
      </div> : <div className="report-list">
        {filtered.map((report, index) => <article className="map-report-card" key={report.id} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
          <div className="report-card-icon" style={{ color: statusColors[report.status] }}><MapPin size={18} /></div>
          <div className="map-report-body">
            <div className="map-report-meta"><span className={`status-pill status-${report.status}`}>{statusLabels[report.status]}</span><time>{new Date(report.created_at).toLocaleDateString()}</time></div>
            {report.is_demo && <span className="demo-data-badge">DEMO ONLY · FICTIONAL</span>}
            <h3>{categoryLabels[report.category]}</h3><p>{report.description}</p>
            {report.latitude != null && <small>{report.latitude.toFixed(4)}, {report.longitude?.toFixed(4)}</small>}
            {!report.is_demo && <div className="popup-actions"><button type="button" onClick={() => void stillPresent(report)}>Still present</button></div>}
          </div>
        </article>)}
        {!filtered.length && <div className="list-empty"><MapPin size={24} /><b>No reports match these filters.</b><span>Clear a filter or check back later.</span></div>}
      </div>}
    </div>
    <div className="map-footnote"><ShieldCheck size={16} />{dataMode === 'demo' ? 'Every visible demo report is fictional and is not a guarantee about the real area shown on the map.' : 'A community report is not a guarantee that an issue is current. Verify your surroundings and use established mobility techniques.'}</div>
  </div>;
}

function MapRecenter({ centre, zoom }: { centre: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.setView(centre, zoom); }, [centre, zoom, map]);
  return null;
}
