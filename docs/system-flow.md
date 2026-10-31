# System flow

```mermaid
sequenceDiagram
  actor Person
  participant UI as AccessLens UI
  participant Camera as Browser camera
  participant Model as COCO-SSD in browser
  participant Cue as Voice / vibration
  participant Local as IndexedDB
  participant Backend as Supabase
  participant Map as Leaflet map
  Person->>UI: Tap Start assistance
  UI->>Camera: Request rear camera permission
  Camera-->>UI: Live stream (no audio)
  UI->>Model: Load model and sample video at reduced cadence
  loop While active
    Model-->>UI: Classes, scores, bounding boxes
    UI->>UI: Filter supported classes, estimate zones and visual-size proximity
    UI->>Cue: Speak/vibrate after priority and cooldown checks
  end
  Person->>UI: Fill report and confirm sharing
  UI->>UI: Validate text, coordinates, photo consent
  alt Backend configured and online
    UI->>Backend: Submit pending text and approximate location with anonymous RPC
    Backend-->>UI: Report ID and status
    UI->>Local: Keep report history and optional photo on this device
  else Offline or backend not configured
    UI->>Local: Store report as local pending sync/draft
  end
  UI->>Map: Read community reports, use cached data offline
```

## Important operational states

- Camera is requested only after the user starts assistance. Permission, missing device, unsupported browser, model failure, and inference failure have visible recovery states.
- Stopping assistance stops every camera track and releases an optional screen wake lock.
- GPS is requested only from the report/map location button. Users can enter coordinates manually.
- A report needs a category, useful description, valid coordinates, and explicit sharing consent before database submission. Photos stay in local storage and are not uploaded. Saving a local draft does not publish it.
- Only supported COCO-SSD labels can be announced. The shipped model does not detect open drains, steps, poles, footpath damage, or free space.
