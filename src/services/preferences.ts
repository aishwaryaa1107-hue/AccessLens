import type { Preferences } from '../types';

const KEY = 'accesslens.preferences.v1';
export const defaults: Preferences = { voice: true, vibration: true, alertIntensity: 'medium', concise: false, language: 'en-US', largeText: false, highContrast: false };
export function readPreferences(): Preferences {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return defaults; }
}
export function savePreferences(value: Preferences) { localStorage.setItem(KEY, JSON.stringify(value)); }
