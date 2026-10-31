export type HazardCategory = 'broken_footpath' | 'open_drain' | 'construction' | 'blocked_footpath' | 'parked_vehicle' | 'unsafe_crossing' | 'damaged_steps' | 'missing_ramp' | 'other';
export type ReportStatus = 'pending' | 'verified' | 'resolved' | 'rejected';
export interface Detection { class: string; score: number; bbox: [number, number, number, number]; zone: 'left' | 'centre' | 'right'; proximity: 'far' | 'medium' | 'near'; priority: 1 | 2 | 3; }
export interface HazardReport {
  id: string; client_submission_id?: string; category: HazardCategory; description: string; notes?: string | null;
  latitude: number | null; longitude: number | null; location_accuracy?: number | null; image_url?: string | null;
  status: ReportStatus; created_at: string; updated_at?: string; is_demo?: boolean;
}
export interface ReportDraft extends HazardReport { photo?: Blob; photo_consent?: boolean; ready_to_submit?: boolean; cloud_submitted?: boolean; local_image_archive?: boolean; local_only: true; }
export interface Preferences { voice: boolean; vibration: boolean; alertIntensity: 'low' | 'medium' | 'high'; concise: boolean; language: string; largeText: boolean; highContrast: boolean; }
