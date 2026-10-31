import { useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Camera, Check, CloudOff, ImagePlus, LocateFixed, MapPin, ShieldCheck, Upload } from 'lucide-react';
import type { HazardCategory, ReportDraft } from '../types';
import { locateUser } from '../services/location';
import { submitReport, saveLocalReport } from '../services/reports';
import { backendConfigured } from '../services/supabase';
import type { FormEvent } from 'react';

const categories: { value: HazardCategory; label: string }[] = [
  { value: 'broken_footpath', label: 'Broken footpath' }, { value: 'open_drain', label: 'Open drain' }, { value: 'construction', label: 'Construction work' },
  { value: 'blocked_footpath', label: 'Blocked footpath' }, { value: 'parked_vehicle', label: 'Parked vehicle obstruction' }, { value: 'unsafe_crossing', label: 'Unsafe crossing' },
  { value: 'damaged_steps', label: 'Damaged steps' }, { value: 'missing_ramp', label: 'Missing accessibility ramp' }, { value: 'other', label: 'Other' }
];

async function compressPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1440 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d'); if (!context) throw new Error('Photo could not be prepared.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
  if (!blob) throw new Error('Photo compression is unavailable in this browser.');
  return new File([blob], 'accesslens-hazard.webp', { type: 'image/webp' });
}

export default function ReportHazard() {
  const [category, setCategory] = useState<HazardCategory | ''>(''); const [description, setDescription] = useState(''); const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState(''); const [longitude, setLongitude] = useState(''); const [accuracy, setAccuracy] = useState<number | null>(null);
  const [photo, setPhoto] = useState<File | null>(null); const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [status, setStatus] = useState(''); const [savedAt, setSavedAt] = useState(''); const picker = useRef<HTMLInputElement>(null);
  const getLocation = async () => { setError(''); setStatus('Requesting location permission…'); try { const pos = await locateUser(); setLatitude(String(pos.latitude)); setLongitude(String(pos.longitude)); setAccuracy(pos.accuracy); setStatus('Location added. Your location is shared only if you submit this report.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Location unavailable.'); setStatus(''); } };
  const makeReport = (): ReportDraft => { const id = crypto.randomUUID(); return { id, client_submission_id: id, category: category as HazardCategory, description: description.trim(), notes: notes.trim() || null, latitude: latitude === '' ? null : Number(latitude), longitude: longitude === '' ? null : Number(longitude), location_accuracy: accuracy, image_url: null, status: 'pending', created_at: new Date().toISOString(), photo: photo ?? undefined, photo_consent: consent, local_only: true }; };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setStatus('');
    if (!category || description.trim().length < 8) { setError('Choose a category and write at least 8 characters describing the issue.'); return; }
    if (!consent) { setError('Confirm that you want to share the report details and location with the community.'); return; }
    if (!latitude || !longitude || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) { setError('Add a valid location before submitting. You can save a draft and add it later.'); return; }
    if (Number(latitude) < -90 || Number(latitude) > 90 || Number(longitude) < -180 || Number(longitude) > 180) { setError('Latitude must be between -90 and 90 and longitude between -180 and 180.'); return; }
    setBusy(true); const report = makeReport();
    try { const result = await submitReport(report, consent); setStatus(result === 'uploaded' ? (report.photo ? 'Report details sent for community review. The optional photo remains only in this browser.' : 'Report submitted for community review.') : backendConfigured ? 'Saved on this device. It will sync when online.' : 'Saved on this device. Add Supabase settings to publish to the community.'); if (result === 'uploaded' || !backendConfigured || !navigator.onLine) setSavedAt(new Date().toLocaleString()); }
    catch (cause) { const detail = cause instanceof Error ? cause.message : 'Could not upload report.'; try { await saveLocalReport({ ...report, ready_to_submit: true }); setStatus('The upload failed. A local copy is saved and will retry when online.'); } catch { setError(detail); } }
    finally { setBusy(false); }
  };
  const saveDraft = async () => { if (!description.trim() && !category) { setError('Add a category or short description before saving a draft.'); return; } const report = makeReport(); try { await saveLocalReport(report); setError(''); setStatus('Draft saved on this device. It is not visible on the community map.'); } catch { setError('This browser could not save a local draft. Try again or check available storage.'); } };
  return <div className="page-wrap report-page"><div className="page-heading"><div><div className="eyebrow muted-eyebrow">COMMUNITY ACCESS</div><h1>Report a hazard</h1><p>Help others learn about an access issue. Reports are marked pending until reviewed.</p></div><div className="report-lock"><ShieldCheck size={19} /><span>Share only what you choose</span></div></div>
    <div className="report-layout"><form className="report-form" onSubmit={(event) => void submit(event)}>
      <div className="form-section"><div className="form-step"><span>01</span><div><h2>What did you notice?</h2><p>Pick the closest match. You can add context below.</p></div></div><label className="field-label" htmlFor="category">Hazard category <span aria-hidden="true">*</span></label><select id="category" value={category} onChange={(event) => setCategory(event.target.value as HazardCategory | '')} required><option value="">Choose a category</option>{categories.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select><label className="field-label" htmlFor="description">Short description <span aria-hidden="true">*</span></label><textarea id="description" rows={3} maxLength={280} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is the access issue? Keep it factual and brief." required /><div className="character-count">{description.length} / 280</div><label className="field-label" htmlFor="notes">Additional details <span className="optional-label">Optional</span></label><textarea id="notes" rows={2} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Helpful details for someone reviewing this report." /></div>
      <div className="form-section"><div className="form-step"><span>02</span><div><h2>Add a location</h2><p>Your coordinates are only shared after you submit.</p></div></div><button type="button" className="button button-outline" onClick={() => void getLocation()}><LocateFixed size={17} /> Detect my location</button><div className="coordinate-grid"><label className="field-label">Latitude<input inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="e.g. 12.9716" /></label><label className="field-label">Longitude<input inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="e.g. 77.5946" /></label></div>{accuracy != null && <small className="location-accuracy">GPS reported accuracy of about {Math.round(accuracy)} m.</small>}</div>
      <div className="form-section"><div className="form-step"><span>03</span><div><h2>Add a photo</h2><p>A photo is optional. It stays in this browser and will not be sent to the community.</p></div></div><input ref={picker} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) void compressPhoto(file).then(setPhoto).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Photo could not be prepared.')); }} aria-label="Choose or capture an optional photo" /><div className="photo-picker"><div className="photo-icon">{photo ? <ImagePlus size={21} /> : <Camera size={21} />}</div><div><b>{photo ? photo.name : 'No photo selected'}</b><small>{photo ? `${(photo.size / 1024 / 1024).toFixed(1)} MB · Compressed locally` : 'Add a photo from your camera or library'}</small></div><button className="button button-outline button-small" type="button" onClick={() => picker.current?.click()}><Upload size={15} /> {photo ? 'Change' : 'Choose photo'}</button></div></div>
      <label className="consent-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I agree to share this description and approximate location with the AccessLens community. Photos stay on this device and are not uploaded.</span></label>
      {error && <div className="form-alert error-alert" role="alert"><AlertCircle size={17} />{error}</div>}{status && <div className="form-alert success-alert" role="status"><Check size={17} /><span>{status}{savedAt && <small> Saved at {savedAt}</small>}</span></div>}
      <div className="submit-row"><button type="button" className="button button-outline" onClick={() => void saveDraft()}>Save draft</button><button type="submit" className="button button-dark" disabled={busy}>{busy ? 'Submitting…' : 'Submit report'} <ArrowRight size={17} /></button></div>
    </form><aside className="report-aside"><div className="aside-note"><div className="aside-note-icon"><MapPin size={22} /></div><span className="section-kicker">LOCATION MATTERS</span><h3>A useful report has a place.</h3><p>Use GPS or type coordinates from another map. If you can’t add a location now, save a draft and return when it’s safe.</p></div><div className="aside-note muted-note"><CloudOff size={21} /><b>Offline?</b><p>Drafts are stored locally in this browser. They aren’t visible to others until a successful upload.</p></div><div className="privacy-note"><ShieldCheck size={17} /><span>Reporters’ email addresses are not displayed on the public map.</span></div></aside></div>
  </div>;
}
