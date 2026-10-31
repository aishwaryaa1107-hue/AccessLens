import { useState } from 'react';
import { ArrowLeft, ArrowRight, AudioLines, Check, Eye, ShieldCheck, Vibrate } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';
import { readPreferences, savePreferences } from '../services/preferences';
import { speak, vibrate } from '../services/audio';
import type { Preferences } from '../types';

const sections = [
  { title: 'Awareness, with choice.', copy: 'AccessLens looks for certain familiar objects using your rear camera. The analysis runs on this device; continuous footage is not uploaded or saved.', icon: Eye },
  { title: 'Hear what matters.', copy: 'Short spoken cues can call attention to an object. Announcements have a cooldown to reduce repetition. Voice can be paused at any time.', icon: AudioLines },
  { title: 'Feel a second cue.', copy: 'If your phone supports vibration, optional patterns can reinforce important alerts. Camera object detection can miss things or misjudge proximity.', icon: Vibrate },
  { title: 'Choose your support.', copy: 'AccessLens complements a cane, guide dog, and your established mobility techniques. It never guarantees a clear route or safe crossing.', icon: ShieldCheck }
];

export default function Onboarding() {
  const [step, setStep] = useState(0); const [prefs, setPrefs] = useState<Preferences>(readPreferences); const navigate = useNavigate();
  const done = () => { savePreferences(prefs); localStorage.setItem('accesslens.onboarded', 'true'); navigate('/dashboard'); };
  const toggle = (key: 'voice' | 'vibration') => setPrefs((value) => ({ ...value, [key]: !value[key] }));
  const current = sections[step]; const Icon = current.icon;
  return <div className="onboarding-page"><header className="onboarding-nav"><Brand /><Link to="/" className="text-link">Exit setup <ArrowRight size={16} /></Link></header><main className="onboarding-panel"><div className="onboarding-progress" aria-label={`Step ${step + 1} of ${sections.length}`}>{sections.map((item, index) => <span key={item.title} className={index <= step ? 'progress-segment complete' : 'progress-segment'} />)}</div><div className="onboarding-content"><div className="onboarding-icon"><Icon size={28} /></div><span className="section-kicker">STEP {String(step + 1).padStart(2, '0')} / 04</span><h1>{current.title}</h1><p>{current.copy}</p>{step === 3 && <div className="preferences-panel"><PreferenceToggle title="Voice assistance" description="Speak detection alerts aloud" active={prefs.voice} onClick={() => toggle('voice')} /><PreferenceToggle title="Vibration" description="Use haptic cues when supported" active={prefs.vibration} onClick={() => toggle('vibration')} /><label className="field-label">Alert intensity<select value={prefs.alertIntensity} onChange={(event) => setPrefs({ ...prefs, alertIntensity: event.target.value as Preferences['alertIntensity'] })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label className="field-label">Announcement style<select value={prefs.concise ? 'concise' : 'balanced'} onChange={(event) => setPrefs({ ...prefs, concise: event.target.value === 'concise' })}><option value="balanced">Balanced</option><option value="concise">Concise</option></select></label><label className="field-label">Speech language<select value={prefs.language} onChange={(event) => setPrefs({ ...prefs, language: event.target.value })}><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="hi-IN">Hindi (India)</option></select></label><div className="test-controls"><button type="button" className="button button-outline" onClick={() => speak('AccessLens voice test. Please pause and check your surroundings.', prefs.language)}><AudioLines size={16} /> Test voice</button><button type="button" className="button button-outline" onClick={() => vibrate([100, 70, 140])}><Vibrate size={16} /> Test vibration</button></div></div>}</div><div className="onboarding-footer">{step > 0 ? <button className="button button-outline" onClick={() => setStep(step - 1)}><ArrowLeft size={17} /> Back</button> : <span className="privacy-small"><ShieldCheck size={16} /> You control each permission.</span>}{step < sections.length - 1 ? <button className="button button-dark" onClick={() => setStep(step + 1)}>Continue <ArrowRight size={17} /></button> : <button className="button button-teal" onClick={done}><Check size={17} /> Save and continue</button>}</div></main></div>;
}

function PreferenceToggle({ title, description, active, onClick }: { title: string; description: string; active: boolean; onClick: () => void }) {
  return <button className="preference-toggle" type="button" role="switch" aria-checked={active} onClick={onClick}><span><b>{title}</b><small>{description}</small></span><span className={`switch-track ${active ? 'on' : ''}`}><i /></span></button>;
}
