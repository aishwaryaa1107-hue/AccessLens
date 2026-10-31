import type { HazardReport } from '../types';

// Fictional records for local demos only. Never submitted to Supabase.
export const DEMO_MAP_CENTER: [number, number] = [12.9716, 77.5946];

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export const demoReports: HazardReport[] = [
  {
    id: 'demo-accesslens-001', is_demo: true, category: 'blocked_footpath',
    description: 'DEMO ONLY: A simulated obstruction example near a sample bus stop.',
    notes: 'Fictional training data. This does not describe a real location or current hazard.',
    latitude: 12.9752, longitude: 77.5994, location_accuracy: 35, status: 'pending', created_at: daysAgo(1)
  },
  {
    id: 'demo-accesslens-002', is_demo: true, category: 'open_drain',
    description: 'DEMO ONLY: A simulated open-drain report for testing category filters.',
    notes: 'Fictional training data. Do not use for navigation or safety decisions.',
    latitude: 12.9691, longitude: 77.6012, location_accuracy: 40, status: 'verified', created_at: daysAgo(3)
  },
  {
    id: 'demo-accesslens-003', is_demo: true, category: 'broken_footpath',
    description: 'DEMO ONLY: A simulated uneven-footpath example near a sample crossing.',
    notes: 'Fictional training data. No real hazard was reported at this coordinate.',
    latitude: 12.9679, longitude: 77.5913, location_accuracy: 28, status: 'pending', created_at: daysAgo(5)
  },
  {
    id: 'demo-accesslens-004', is_demo: true, category: 'unsafe_crossing',
    description: 'DEMO ONLY: A simulated crossing report for map-popup demonstrations.',
    notes: 'Fictional training data. This is not a verified street-safety assessment.',
    latitude: 12.9801, longitude: 77.5902, location_accuracy: 52, status: 'resolved', created_at: daysAgo(8)
  },
  {
    id: 'demo-accesslens-005', is_demo: true, category: 'construction',
    description: 'DEMO ONLY: A simulated construction-obstruction example.',
    notes: 'Fictional training data. Included only to exercise the map and filters.',
    latitude: 12.9638, longitude: 77.5976, location_accuracy: 31, status: 'verified', created_at: daysAgo(12)
  },
  {
    id: 'demo-accesslens-006', is_demo: true, category: 'missing_ramp',
    description: 'DEMO ONLY: A simulated missing-ramp report for accessibility testing.',
    notes: 'Fictional training data. This does not represent a real building or entrance.',
    latitude: 12.9822, longitude: 77.6031, location_accuracy: 45, status: 'pending', created_at: daysAgo(16)
  },
  {
    id: 'demo-accesslens-007', is_demo: true, category: 'parked_vehicle',
    description: 'DEMO ONLY: A simulated parked-vehicle obstruction example.',
    notes: 'Fictional training data. Included only to exercise the category filter.',
    latitude: 12.9768, longitude: 77.5869, location_accuracy: 33, status: 'pending', created_at: daysAgo(2)
  },
  {
    id: 'demo-accesslens-008', is_demo: true, category: 'damaged_steps',
    description: 'DEMO ONLY: A simulated damaged-steps report for interface testing.',
    notes: 'Fictional training data. This is not a real accessibility assessment.',
    latitude: 12.9649, longitude: 77.5907, location_accuracy: 49, status: 'verified', created_at: daysAgo(9)
  },
  {
    id: 'demo-accesslens-009', is_demo: true, category: 'other',
    description: 'DEMO ONLY: A simulated accessibility concern in the other category.',
    notes: 'Fictional training data. No real report has been submitted at this location.',
    latitude: 12.9861, longitude: 77.5963, location_accuracy: 42, status: 'resolved', created_at: daysAgo(20)
  }
];

export function downloadDemoDataset() {
  const dataset = {
    dataset_name: 'AccessLens fictional demo hazard reports',
    synthetic: true,
    warning: 'All records are fictional examples. They are not real hazards and must not be used for navigation or safety decisions.',
    generated_at: new Date().toISOString(),
    records: demoReports
  };
  const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = 'accesslens-fictional-demo-hazard-reports.json';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
