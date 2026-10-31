import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';

type Phase = 'playing' | 'leaving' | 'done';

function canAnimate() {
  return typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function OpeningSequence() {
  const [phase, setPhase] = useState<Phase>(() => canAnimate() ? 'playing' : 'done');

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setTimeout(() => setPhase('leaving'), 2300);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const timer = window.setTimeout(() => setPhase('done'), 520);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === 'done') return null;

  return <div className={`cinematic-opening ${phase === 'leaving' ? 'cinematic-opening-exit' : ''}`} role="dialog" aria-modal="true" aria-labelledby="opening-title">
    <button className="cinematic-skip" type="button" autoFocus onClick={() => setPhase('leaving')}>Skip intro</button>
    <div className="cinematic-stage">
      <div className="cinematic-lens" aria-hidden="true">
        <span className="lens-orbit lens-orbit-one" /><span className="lens-orbit lens-orbit-two" />
        <span className="lens-sweep" /><span className="lens-core"><Eye size={44} strokeWidth={1.35} /></span>
      </div>
      <p className="cinematic-kicker">ENVIRONMENTAL AWARENESS SYSTEM</p>
      <h1 id="opening-title" className="cinematic-wordmark">access<span>lens</span></h1>
      <p className="cinematic-tagline">See beyond the frame. Notice what matters.</p>
      <div className="cinematic-progress" aria-hidden="true"><span /></div>
    </div>
  </div>;
}
