import { openDB } from 'idb';
import { supabase } from './supabase';
import type { HazardReport, ReportDraft } from '../types';

const DB_NAME = 'accesslens-local';
const STORE = 'reports';
const db = () => openDB(DB_NAME, 1, { upgrade(database) { if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: 'id' }); } });

export async function saveLocalReport(report: ReportDraft) { const database = await db(); await database.put(STORE, report); }
export async function getLocalReports(): Promise<ReportDraft[]> { const database = await db(); return database.getAll(STORE); }
export async function removeLocalReport(id: string) { const database = await db(); await database.delete(STORE, id); }

export async function submitReport(report: ReportDraft, sharingConsent: boolean): Promise<'uploaded' | 'queued'> {
  if (!supabase || !navigator.onLine) { await saveLocalReport({ ...report, photo_consent: sharingConsent, ready_to_submit: true }); return 'queued'; }
  const { error } = await supabase.rpc('submit_community_report', {
    report_id: report.id,
    submission_id: report.client_submission_id || report.id,
    report_category: report.category,
    report_description: report.description,
    report_notes: report.notes || null,
    report_latitude: report.latitude,
    report_longitude: report.longitude,
    report_location_accuracy: report.location_accuracy ?? null
  });
  if (error) throw error;
  const { photo, ...details } = report;
  await saveLocalReport({ ...details, photo: sharingConsent ? photo : undefined, photo_consent: sharingConsent, ready_to_submit: false, cloud_submitted: true, local_image_archive: Boolean(photo && sharingConsent), local_only: true });
  return 'uploaded';
}

export async function syncQueuedReports() {
  if (!supabase || !navigator.onLine) return;
  const reports = await getLocalReports();
  for (const report of reports) {
    if (!report.ready_to_submit || report.cloud_submitted || report.latitude == null || report.longitude == null) continue;
    try { await submitReport(report, report.photo_consent ?? false); } catch { /* leave queued for a later attempt */ }
  }
}

export async function fetchCommunityReports(): Promise<HazardReport[]> {
  const cacheKey = 'accesslens.community-reports.v3';
  if (!supabase || !navigator.onLine) {
    try { return JSON.parse(localStorage.getItem(cacheKey) || '[]') as HazardReport[]; } catch { return []; }
  }
  const { data, error } = await supabase.from('community_hazard_reports').select('id,category,description,notes,latitude,longitude,status,created_at,updated_at').neq('status', 'rejected').order('created_at', { ascending: false }).limit(500);
  if (error) {
    try { return JSON.parse(localStorage.getItem(cacheKey) || '[]') as HazardReport[]; } catch { throw error; }
  }
  const reports = (data || []) as HazardReport[];
  try { localStorage.setItem(cacheKey, JSON.stringify(reports)); } catch { /* map remains usable if local storage is full */ }
  return reports;
}

export async function reportStillPresent(reportId: string): Promise<boolean> {
  if (!supabase || !navigator.onLine) return false;
  const key = `accesslens.feedback.${reportId}`;
  const feedbackId = localStorage.getItem(key) || crypto.randomUUID();
  const { error } = await supabase.rpc('submit_report_feedback', { target_report_id: reportId, feedback_id: feedbackId });
  if (!error) localStorage.setItem(key, feedbackId);
  return !error;
}
