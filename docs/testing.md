# Testing and device checks

## Automated

- `npm test` runs unit tests for supported-object filtering, spatial zones, approximate proximity, alert wording, cooldown suppression, and vibration patterns.
- `npm run build` runs TypeScript project checks and a production Vite/PWA build.

## Manual browser checks

1. Run locally on `localhost` (or serve over HTTPS on a reachable development address for a phone).
2. Open Live Assistance and verify the browser does not request camera access before Start.
3. Grant access, verify the rear camera, load the real COCO-SSD model, and present familiar COCO objects such as a person, chair, bicycle, or car to the camera. Check boxes, zone labels, and alert cooldowns.
4. Pause, resume, switch cameras if available, then stop. Verify that the browser camera indicator turns off.
5. Disable voice/haptics independently. Check unsupported APIs gracefully degrade.
6. Submit a test hazard with consent in a non-production Supabase project. Verify pending status, map marker, and report history in Supabase. Confirm the photo remains on the device.
7. Disable network after loading the PWA/model. Confirm the app shell, cached model, and local draft workflow. Reconnect and verify a single queued row is created.

Real Android camera, speech, vibration, geolocation, background sync, and offline model cache checks require a device/browser session and were not simulated by unit tests. Supabase checks require a configured project and an applied migration.
