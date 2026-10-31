import { useEffect, useState } from 'react';
import { AudioLines, Check, Contrast, Eye, Type, Vibrate } from 'lucide-react';
import type { ReactNode } from 'react';
import { readPreferences, savePreferences } from '../services/preferences';
import { speak, vibrate } from '../services/audio';
import type { Preferences } from '../types';

export default function Settings() {
  const [prefs, setPrefs] = useState<Preferences>(readPreferences);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('large-text', prefs.largeText);
    document.documentElement.classList.toggle('high-contrast', prefs.highContrast);
  }, [prefs.largeText, prefs.highContrast]);
  const update = (key: keyof Preferences, value: Preferences[keyof Preferences]) => { setPrefs((current) => ({ ...current, [key]: value })); setSaved(false); };
  const save = () => { savePreferences(prefs); setSaved(true); };
  return <div className="page-wrap narrow-page">
    <div className="page-heading"><div><div className="eyebrow muted-eyebrow">MAKE IT YOURS</div><h1>Assistance settings</h1><p>Set how AccessLens shares information with you.</p></div></div>
    <section className="settings-card">
      <div className="settings-section"><div className="settings-heading"><AudioLines /><div><h2>Voice guidance</h2><p>Spoken cues for detections. Your browser controls available voices.</p></div></div><Toggle label="Speak alerts" checked={prefs.voice} onChange={(value) => update('voice', value)} /><button type="button" className="button button-outline" onClick={() => speak('AccessLens voice test. Please pause and check your surroundings.', prefs.language)}><AudioLines size={16} /> Test voice</button><label className="field-label">Language<select value={prefs.language} onChange={(event) => update('language', event.target.value)}><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="hi-IN">Hindi (India)</option></select></label><label className="field-label">Announcement frequency<select value={prefs.concise ? 'concise' : 'balanced'} onChange={(event) => update('concise', event.target.value === 'concise')}><option value="balanced">Balanced</option><option value="concise">Concise</option></select></label></div>
      <div className="settings-section"><div className="settings-heading"><Vibrate /><div><h2>Haptic feedback</h2><p>Distinct vibration patterns on supported devices.</p></div></div><Toggle label="Vibration alerts" checked={prefs.vibration} onChange={(value) => update('vibration', value)} /><button type="button" className="button button-outline" onClick={() => vibrate([100, 70, 140])}><Vibrate size={16} /> Test vibration</button><label className="field-label">Alert intensity<select value={prefs.alertIntensity} onChange={(event) => update('alertIntensity', event.target.value as Preferences['alertIntensity'])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div>
      <div className="settings-section"><div className="settings-heading"><Eye /><div><h2>Display and access</h2><p>Visual options apply to this browser on this device.</p></div></div><Toggle label="Larger text" checked={prefs.largeText} onChange={(value) => update('largeText', value)} icon={<Type size={16} />} /><Toggle label="Higher contrast" checked={prefs.highContrast} onChange={(value) => update('highContrast', value)} icon={<Contrast size={16} />} /></div>
      <div className="settings-save"><span role="status">{saved ? <><Check size={16} /> Saved on this device</> : 'Changes are not saved yet'}</span><button className="button button-dark" onClick={save}>Save preferences <Check size={16} /></button></div>
    </section>
    <div className="settings-local-note"><Eye size={17} /><span>AccessLens opens without an account. Your assistance settings and local report drafts stay in this browser.</span></div>
  </div>;
}

function Toggle({ label, checked, onChange, icon }: { label: string; checked: boolean; onChange: (value: boolean) => void; icon?: ReactNode }) { return <button className="settings-toggle" type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>{icon}{label}<span className={`switch-track ${checked ? 'on' : ''}`}><i /></span></button>; }
