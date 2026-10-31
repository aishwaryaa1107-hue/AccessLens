import { describe, expect, it } from 'vitest';
import type { DetectedObject } from '@tensorflow-models/coco-ssd';
import { assessObject, describeDetection, selectAlert, vibrationPattern } from './awareness';

function object(label: string, bbox: [number, number, number, number], score = 0.9): DetectedObject {
  return { class: label, bbox, score };
}

describe('AccessLens awareness engine', () => {
  it('classifies bounding-box centers into left, centre, and right zones', () => {
    expect(assessObject(object('person', [10, 10, 10, 20]), 100, 100)?.zone).toBe('left');
    expect(assessObject(object('person', [40, 10, 20, 20]), 100, 100)?.zone).toBe('centre');
    expect(assessObject(object('person', [80, 10, 10, 20]), 100, 100)?.zone).toBe('right');
  });

  it('uses box area as a relative visual-size estimate, never a metric distance', () => {
    expect(assessObject(object('chair', [10, 10, 10, 10]), 100, 100)?.proximity).toBe('far');
    expect(assessObject(object('chair', [10, 10, 32, 32]), 100, 100)?.proximity).toBe('medium');
    expect(assessObject(object('chair', [10, 10, 60, 60]), 100, 100)?.proximity).toBe('near');
  });

  it('ignores unsupported labels and low-confidence predictions', () => {
    expect(assessObject(object('open drain', [10, 10, 70, 70]), 100, 100)).toBeNull();
    expect(assessObject(object('person', [10, 10, 20, 20], 0.3), 100, 100)).toBeNull();
    expect(assessObject(object('person', [10, 10, 20, 20]), 0, 100)).toBeNull();
  });

  it('uses cautious copy for close centre detections', () => {
    const detection = assessObject(object('car', [20, 20, 65, 65]), 100, 100)!;
    expect(describeDetection(detection)).toBe('Obstacle close ahead. Stop and check your surroundings.');
    expect(describeDetection(detection)).not.toMatch(/move (left|right)/i);
  });

  it('selects the highest-priority available alert and suppresses repeat keys', () => {
    const medium = assessObject(object('person', [40, 20, 30, 30]), 100, 100)!;
    const urgent = assessObject(object('car', [40, 10, 45, 65]), 100, 100)!;
    const alerts = new Map<string, number>();
    expect(selectAlert([medium, urgent], 10000, alerts)?.class).toBe('car');
    expect(selectAlert([urgent], 12000, alerts)).toBeNull();
    expect(selectAlert([urgent], 15000, alerts)?.class).toBe('car');
  });

  it('scales distinct vibration patterns with the user intensity', () => {
    expect(vibrationPattern(1, 'low')).toEqual([48]);
    expect(vibrationPattern(2, 'medium')).toEqual([130, 80, 130]);
    expect(vibrationPattern(3, 'high')).toEqual([243, 122, 243, 122, 405]);
  });
});
