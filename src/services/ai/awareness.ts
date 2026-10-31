import type { Detection } from '../../types';
import type { DetectedObject } from '@tensorflow-models/coco-ssd';

const urgent = new Set(['car', 'truck', 'bus', 'motorcycle', 'bicycle']);
const relevant = new Set([...urgent, 'person', 'chair', 'backpack', 'handbag', 'suitcase', 'bench', 'dog', 'cat']);

export function assessObject(item: DetectedObject, frameWidth: number, frameHeight: number): Detection | null {
  const score = item.score ?? 0;
  if (!relevant.has(item.class) || score < 0.48 || frameWidth <= 0 || frameHeight <= 0) return null;
  const [x, y, width, height] = item.bbox as [number, number, number, number];
  const centreX = (x + width / 2) / frameWidth;
  const zone = centreX < 0.36 ? 'left' : centreX > 0.64 ? 'right' : 'centre';
  const areaRatio = (width * height) / (frameWidth * frameHeight);
  const proximity = areaRatio > 0.26 ? 'near' : areaRatio > 0.09 ? 'medium' : 'far';
  const priority = (urgent.has(item.class) && (zone === 'centre' || proximity === 'near') ? 3 : proximity === 'near' ? 2 : 1) as Detection['priority'];
  return { class: item.class, score, bbox: [x, y, width, height], zone, proximity, priority };
}

export function describeDetection(detection: Detection, concise = false): string {
  const name = detection.class === 'person' ? 'Person' : detection.class === 'bicycle' ? 'Bicycle' : detection.class === 'motorcycle' ? 'Motorcycle' : detection.class.charAt(0).toUpperCase() + detection.class.slice(1);
  const direction = detection.zone === 'centre' ? 'ahead' : `on your ${detection.zone}`;
  if (detection.proximity === 'near' && detection.zone === 'centre') return 'Obstacle close ahead. Stop and check your surroundings.';
  if (detection.proximity === 'near') return `Nearby ${name.toLowerCase()} ${direction}. Please slow down and check.`;
  if (urgent.has(detection.class) && detection.zone === 'centre') return `${name} detected ahead. Please pause and assess your surroundings.`;
  return concise ? `${name} ${direction}.` : `${name} detected ${direction}.`;
}

export function selectAlert(detections: Detection[], now: number, lastAlerts: Map<string, number>, cooldownMs = 4500): Detection | null {
  const sorted = [...detections].sort((a, b) => b.priority - a.priority || b.score - a.score);
  for (const detection of sorted) {
    const key = `${detection.class}:${detection.zone}:${detection.proximity}`;
    if (now - (lastAlerts.get(key) ?? 0) >= cooldownMs) { lastAlerts.set(key, now); return detection; }
  }
  return null;
}

export function vibrationPattern(priority: Detection['priority'], intensity: 'low' | 'medium' | 'high'): number[] {
  const scale = intensity === 'low' ? 0.6 : intensity === 'high' ? 1.35 : 1;
  const base = priority === 3 ? [180, 90, 180, 90, 300] : priority === 2 ? [130, 80, 130] : [80];
  return base.map((value) => Math.round(value * scale));
}
