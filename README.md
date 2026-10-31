# AccessLens

**See Beyond Sight. Move With Confidence.**

AccessLens is a mobile-first progressive web app that adds an environmental awareness layer for blind and low-vision people. It recognizes a defined set of familiar objects using the phone camera, provides optional voice and vibration cues, and lets the community share accessibility hazards.

> AccessLens can miss objects, misclassify scenes, and misjudge visual size. It does not identify a safe path or replace a white cane, guide dog, or established mobility techniques. Pause in a safe place before interacting with the phone.

## Open the app directly

There is no sign-in, registration, password, or Supabase Auth step. The app opens at its landing page and all core pages are available without an account. Camera access is requested only after the user presses **Start assistance**.

## Features

- Responsive landing, onboarding, dashboard, live assistance, hazard reporting, community map, and local settings.
- Real TensorFlow.js COCO-SSD MobileNet v2 inference in the browser; bounding boxes, confidence, left/centre/right zones, and approximate far/medium/near labels.
- Alert cooldown and priority rules, speech synthesis, vibration patterns, pause/resume/stop controls, and camera cleanup.
- GPS or manually entered coordinates, local photo compression, explicit report consent, IndexedDB drafts, and retry after reconnection.
- Optional Supabase PostgreSQL for anonymous pending reports and a community map. Public map coordinates are rounded to three decimal places. Photos remain local in no-account mode.
- Leaflet/OpenStreetMap, category/status filters, map/list views, place search, and an idempotent “still present” community update.
- When no Supabase project is configured, the map opens with nine clearly labeled fictional examples; use **Download JSON** to get the demo dataset. These examples are never uploaded or presented as real hazards.
- A short, skippable cinematic opening and restrained page, marker, and popup animations. The opening respects the system reduced-motion preference.
- Installable PWA with an offline app shell and runtime caching for TensorFlow model and map resources.

## Model scope and limitations

COCO-SSD is a pretrained general object detector. AccessLens announces a limited subset: person, bicycle, car, motorcycle, bus, truck, chair, backpack, handbag, suitcase, bench, dog, and cat. It does **not** detect open drains, poles, steps, footpath damage, ground-level changes, free space, or a traversable route.

Near/medium/far is estimated from the fraction of the image occupied by an object. It is not depth sensing and never gives a distance in metres. Camera angle, object size, occlusion, lighting, and model errors can change the estimate.

## Requirements

- Node.js 20+ and npm.
- A modern browser. Camera and GPS require HTTPS, except on `localhost`.
- Supabase credentials are optional. Without them, camera assistance and local hazard drafts still work; shared reports are unavailable.

## Install and run

From the project directory:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. Other useful commands:

```powershell
npm test
npm run build
npm run preview
```

On Windows, create local Supabase settings only if you want shared reports:

```powershell
Copy-Item .env.example .env.local
```

## Optional Supabase setup (no Supabase Auth)

1. Create a Supabase project. **Do not enable or configure Supabase Auth for AccessLens**; the app does not call its Auth API.
2. Put the project URL and browser-safe anon/publishable key in `.env.local`:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PROJECT_PUBLISHABLE_KEY
   ```

   Never put a service-role key in a `VITE_` variable or frontend code.
3. Apply [`supabase/migrations/202610300001_accesslens.sql`](supabase/migrations/202610300001_accesslens.sql) from Supabase Studio’s SQL editor, or use the Supabase CLI:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

4. The app submits only validated, pending text/location reports through the `submit_community_report` RPC. Browser clients cannot read the raw table; the map uses `community_hazard_reports`, which omits submission IDs and rounds coordinates. No anonymous photo upload or storage bucket is configured.
5. Reports are pending until a project owner reviews them in Supabase Studio. The no-account app has no in-app admin route and cannot verify, reject, or resolve reports. “Still present” feedback is idempotent per browser.

Anonymous report publishing is intentionally constrained: database checks validate the category, description length, coordinates, and pending status; retries use a unique submission ID; photos are not uploaded. Add a CAPTCHA or server-side rate limit before opening a production project to unrestricted public submissions.

## Privacy and offline use

- Camera frames are processed locally and never saved or sent to Supabase.
- Location is requested only after the user presses a location button.
- The sharing checkbox is required before submitting a report. Photos are compressed in the browser and kept in local IndexedDB; they are not uploaded.
- Without Supabase credentials, report drafts remain on the device and are not presented as community reports.
- Offline report submissions queue locally and retry when internet returns. A saved draft does not auto-publish until the user submits it.
- The app shell and fetched model/map resources can work offline after their first load. Browser cache behavior should be checked on the target Android device.

## Testing

`npm test` covers supported-object filtering, spatial zones, relative proximity, caution wording, alert cooldowns, and haptic patterns. `npm run build` runs TypeScript checks, Vite, and service-worker generation. See [`docs/testing.md`](docs/testing.md) for manual workflows.

## Test on Android

1. Use an HTTPS preview/staging URL or HTTPS development tunnel; camera access is blocked on plain LAN HTTP.
2. Open the site in current Android Chrome. Start assistance while stationary and grant camera permission.
3. Load the model once while online. Verify detections with visible COCO objects, pause/resume, switch camera, stop, speech, vibration, and GPS behavior.
4. Test a report in a non-production Supabase project. Check pending status and generalized map location. Verify that photo data stays on the phone.
5. Disable network after the PWA and model have loaded; test app-shell use and local report queuing. Reconnect and confirm only explicitly submitted reports sync.

## Known limitations

- Inference runs on the main UI thread at reduced resolution/cadence; low-end phones may lag or drain battery.
- The TensorFlow model is downloaded on first use. Offline inference is unavailable until the model assets have loaded and been cached.
- Speech, vibration, wake lock, camera switching, GPS, and map tiles vary by browser/device.
- Anonymous community reports need project moderation. Add server-side abuse controls before production use.
- Admin review, account profiles, trusted contacts, voice commands, geographic analytics, and cloud photo uploads are not included in this no-auth version.
