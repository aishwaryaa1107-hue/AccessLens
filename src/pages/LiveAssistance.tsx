import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, ArrowLeft, AudioLines, Camera, CameraOff, CirclePause, CirclePlay, RotateCcw, ShieldCheck, Volume2, VolumeX, Vibrate } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import type { Detection } from '../types';
import { assessObject, describeDetection, selectAlert, vibrationPattern } from '../services/ai/awareness';
import { readPreferences } from '../services/preferences';
import { speak, stopSpeaking, vibrate } from '../services/audio';
import { Link } from 'react-router-dom';

type SessionState = 'idle' | 'camera' | 'loading' | 'active' | 'paused' | 'error';
type Model = cocoSsd.ObjectDetection;

export default function LiveAssistance() {
  const videoRef = useRef<HTMLVideoElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null); const modelRef = useRef<Model | null>(null);
  const timerRef = useRef<number | null>(null); const alertTimes = useRef(new Map<string, number>()); const wakeLockRef = useRef<WakeLockSentinel | null>(null); const lastAnnouncement = useRef(0); const sessionGeneration = useRef(0);
  const [state, setState] = useState<SessionState>('idle'); const [message, setMessage] = useState('Ready to start when you are.');
  const [error, setError] = useState(''); const [detections, setDetections] = useState<Detection[]>([]); const [history, setHistory] = useState<{ text: string; at: string }[]>([]);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment'); const [prefs] = useState(readPreferences);

  const stopSession = useCallback(() => {
    sessionGeneration.current += 1;
    if (timerRef.current) window.clearTimeout(timerRef.current); timerRef.current = null;
    stopSpeaking(); streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    void wakeLockRef.current?.release(); wakeLockRef.current = null;
    const canvas = canvasRef.current; const context = canvas?.getContext('2d'); if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    modelRef.current?.dispose(); modelRef.current = null; setDetections([]); setError(''); setState('idle'); setMessage('Assistance paused. Your camera is off.');
  }, []);

  const runLoop = useCallback(async (generation: number): Promise<void> => {
    if (generation !== sessionGeneration.current) return;
    const video = videoRef.current; const model = modelRef.current;
    if (!video || !model || video.readyState < 2 || video.paused) { timerRef.current = window.setTimeout(() => void runLoop(generation), 500); return; }
    try {
      const raw = await model.detect(video, 20, 0.38);
      if (generation !== sessionGeneration.current) return;
      const found = raw.map((item) => assessObject(item, video.videoWidth, video.videoHeight)).filter((item): item is Detection => item !== null);
      setDetections(found); drawBoxes(found, video, canvasRef.current);
      const now = Date.now(); const alert = now - lastAnnouncement.current > 2800 ? selectAlert(found, now, alertTimes.current) : null;
      if (alert) {
        lastAnnouncement.current = now;
        const text = describeDetection(alert, prefs.concise); setMessage(text);
        setHistory((items) => [{ text, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...items].slice(0, 5));
        if (prefs.voice) speak(text, prefs.language);
        if (prefs.vibration) vibrate(vibrationPattern(alert.priority, prefs.alertIntensity));
      }
    } catch {
      if (generation !== sessionGeneration.current) return;
      setMessage('Camera detection temporarily unavailable.');
    }
    timerRef.current = window.setTimeout(() => void runLoop(generation), 800);
  }, [prefs]);

  const start = async (nextFacing = facing) => {
    const generation = ++sessionGeneration.current;
    setError(''); setState('camera'); setMessage('Requesting rear camera permission…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not available in this browser. Use a current browser over HTTPS.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: nextFacing }, width: { ideal: 640, max: 960 }, height: { ideal: 480, max: 720 }, frameRate: { ideal: 15, max: 20 } } });
      if (generation !== sessionGeneration.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Camera preview could not be prepared.');
      videoRef.current.srcObject = stream; await videoRef.current.play(); setMessage('Loading on-device object detection…'); setState('loading');
      try { await tf.setBackend('webgl'); await tf.ready(); } catch { await tf.setBackend('cpu'); await tf.ready(); }
      const loadedModel = await cocoSsd.load({ base: 'mobilenet_v2' });
      if (generation !== sessionGeneration.current) { loadedModel.dispose(); stream.getTracks().forEach((track) => track.stop()); return; }
      modelRef.current = loadedModel;
      setState('active'); setMessage('Listening for supported objects. Camera frames stay on this device.');
      const wakeLock = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> } };
      if (wakeLock.wakeLock) { try { const sentinel = await wakeLock.wakeLock.request('screen'); if (generation !== sessionGeneration.current) { await sentinel.release(); return; } wakeLockRef.current = sentinel; } catch { /* optional capability */ } }
      timerRef.current = window.setTimeout(() => void runLoop(generation), 100);
    } catch (cause) {
      if (generation !== sessionGeneration.current) return;
      streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
      const detail = cause instanceof Error ? cause.message : 'Could not start camera assistance.';
      setError(detail); setMessage('Camera or model could not start.'); setState('error');
    }
  };

  useEffect(() => () => { sessionGeneration.current += 1; if (timerRef.current) window.clearTimeout(timerRef.current); streamRef.current?.getTracks().forEach((track) => track.stop()); void wakeLockRef.current?.release(); stopSpeaking(); }, []);

  const pause = () => {
    if (state === 'active') { sessionGeneration.current += 1; if (timerRef.current) window.clearTimeout(timerRef.current); timerRef.current = null; if (videoRef.current) videoRef.current.pause(); stopSpeaking(); setState('paused'); setMessage('Detection paused. Resume when you are ready.'); }
    else if (state === 'paused' && videoRef.current) { void videoRef.current.play(); setState('active'); setMessage('Listening for supported objects.'); timerRef.current = window.setTimeout(() => void runLoop(sessionGeneration.current), 100); }
  };
  const switchCamera = async () => { const next = facing === 'environment' ? 'user' : 'environment'; stopSession(); setFacing(next); await start(next); };
  const current = detections.length ? `${detections.length} supported ${detections.length === 1 ? 'object' : 'objects'} currently detected` : state === 'active' ? 'No supported objects detected in the current view.' : message;

  return <div className="page-wrap live-page"><div className="live-header"><Link to="/dashboard" className="back-link"><ArrowLeft size={17} /> Back</Link><div><div className="eyebrow muted-eyebrow">ON-DEVICE AWARENESS</div><h1>Live assistance</h1></div><div className={`session-pill ${state === 'active' ? 'is-live' : ''}`}><i />{state === 'active' ? 'Scanning' : state === 'paused' ? 'Paused' : state === 'loading' ? 'Loading' : state === 'camera' ? 'Camera' : 'Standby'}</div></div>
    <div className="live-layout"><section className="camera-column"><div className={`camera-view ${state === 'active' ? 'camera-active' : ''}`}>
      <video ref={videoRef} muted playsInline aria-label="Live rear camera preview" />
      <canvas ref={canvasRef} aria-hidden="true" />
      {state !== 'active' && state !== 'paused' && <div className="camera-placeholder"><div className="camera-placeholder-icon">{state === 'error' ? <AlertTriangle size={28} /> : <Camera size={28} />}</div><b>{state === 'loading' ? 'Preparing local detection' : state === 'camera' ? 'Opening camera' : state === 'error' ? 'Assistance unavailable' : 'Your camera stays yours'}</b><span>{state === 'loading' ? 'Loading the COCO-SSD model. This may take a moment.' : state === 'error' ? error : 'Start only when you are safely stationary. No camera frames are saved.'}</span></div>}
      {state === 'paused' && <div className="paused-overlay"><CirclePause size={34} /><b>Detection paused</b><span>Camera preview is visible but not being processed.</span></div>}
      <div className="camera-corner camera-corner-tl" /><div className="camera-corner camera-corner-tr" /><div className="camera-corner camera-corner-bl" /><div className="camera-corner camera-corner-br" />
      {(state === 'active' || state === 'paused') && <div className="camera-chip"><span className={state === 'active' ? 'mini-live' : ''} />{state === 'active' ? 'LOCAL DETECTION ACTIVE' : 'PAUSED'}</div>}
    </div>
    <div className="camera-actions">{state === 'idle' || state === 'error' ? <button className="button button-teal button-large" onClick={() => void start()}><Camera size={19} /> Start assistance</button> : <><button className="button button-outline button-large" onClick={stopSession}><CameraOff size={18} /> Stop session</button>{(state === 'active' || state === 'paused') && <><button className="button button-teal button-large" onClick={pause}>{state === 'active' ? <><CirclePause size={19} /> Pause detection</> : <><CirclePlay size={19} /> Resume detection</>}</button><button className="icon-button" aria-label="Switch camera" onClick={() => void switchCamera()} title="Switch camera"><RotateCcw size={18} /></button></>}</>}</div>
    <p className="status-line" role="status"><span className="status-indicator" />{message}</p>
    <div className="safety-callout"><ShieldCheck size={19} /><span><b>Pause before you move.</b> A single camera can miss hazards, and proximity is only a visual estimate. This tool does not identify a safe path.</span></div>
    </section><aside className="live-side"><section className="alert-card"><div className="side-card-label"><span className="small-ring"><AudioLines size={15} /></span> MOST RECENT ALERT</div><h2>{state === 'active' ? 'Listening for objects' : 'Ready when you are'}</h2><p className="current-alert" aria-live="polite">{current}</p><div className="feedback-status"><span>{prefs.voice ? <Volume2 size={16} /> : <VolumeX size={16} />} Voice {prefs.voice ? 'on' : 'off'}</span><span>{prefs.vibration ? <Vibrate size={16} /> : <Vibrate size={16} />} Haptics {prefs.vibration ? 'on' : 'off'}</span></div><Link className="inline-settings" to="/settings">Adjust alert settings <ArrowLeft className="arrow-rotate" size={15} /></Link></section>
      <section className="detections-card"><div className="side-card-heading"><div><div className="side-card-label"><Activity size={15} /> IN VIEW</div><h3>Detected objects</h3></div><span className="count-badge">{detections.length}</span></div>{detections.length ? <ul className="detection-list">{detections.map((item, index) => <li key={`${item.class}-${item.zone}-${index}`}><span className={`detection-severity severity-${item.priority}`} /><span><b>{item.class}</b><small>{item.zone} · {item.proximity}</small></span><span className="confidence">{Math.round(item.score * 100)}%</span></li>)}</ul> : <div className="empty-detections"><span className="empty-radar"><Activity size={19} /></span><p>{state === 'active' ? 'No supported objects are visible right now.' : 'Detections will appear here while assistance is active.'}</p></div>}</section>
      <section className="history-card"><div className="side-card-label">RECENT SESSION CUES</div>{history.length ? history.map((item, index) => <div className="history-row" key={`${item.at}-${index}`}><span>{item.text}</span><time>{item.at}</time></div>) : <p className="history-empty">This short history stays in memory for this session only.</p>}</section>
    </aside></div><div className="model-note"><span>MODEL</span><div><b>COCO-SSD MobileNet v2</b><small>Recognizes common COCO objects such as people, bicycles, cars, motorcycles, buses, trucks, chairs, bags and backpacks. It does not detect stairs, drains, poles, or path condition.</small></div><ShieldCheck size={17} /></div>
  </div>;
}

function drawBoxes(items: Detection[], video: HTMLVideoElement, canvas: HTMLCanvasElement | null) {
  if (!canvas || !video.videoWidth || !video.videoHeight) return;
  const bounds = video.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(bounds.width * dpr); canvas.height = Math.round(bounds.height * dpr); canvas.style.width = `${bounds.width}px`; canvas.style.height = `${bounds.height}px`;
  const context = canvas.getContext('2d'); if (!context) return;
  context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, bounds.width, bounds.height);
  const scale = Math.max(bounds.width / video.videoWidth, bounds.height / video.videoHeight); const cropX = (video.videoWidth * scale - bounds.width) / 2; const cropY = (video.videoHeight * scale - bounds.height) / 2;
  for (const item of items) {
    const [x, y, width, height] = item.bbox; const left = x * scale - cropX; const top = y * scale - cropY; const boxWidth = width * scale; const boxHeight = height * scale;
    const color = item.priority === 3 ? '#ff7167' : item.priority === 2 ? '#f4bb72' : '#8ce6d2';
    context.strokeStyle = color; context.lineWidth = 2.5; context.strokeRect(left, top, boxWidth, boxHeight); context.fillStyle = color; context.font = '600 12px Inter, system-ui';
    const label = `${item.class} ${Math.round(item.score * 100)}%`; const labelWidth = context.measureText(label).width + 14; context.fillRect(left, Math.max(0, top - 23), labelWidth, 22); context.fillStyle = '#101d2b'; context.fillText(label, left + 7, Math.max(15, top - 8));
  }
}
