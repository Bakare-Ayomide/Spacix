# UI Inventory & Specification (`docs/ui-inventory.md`)

## 1. Visual Language & Quanta Tokens
- **Canvas**: Deep obsidian dark (`#09090B` primary background, `#111114` elevated surface, `#18181C` interactive card surface, `rgba(255,255,255,0.08)` 1px hairline border).
- **Accent**: Electric Lime `#D1FE17` (`--primary`) with `#09090B` dark ink text. Reserved strictly for the primary Generate CTA, Upgrade button, and active mode indicators.
- **Typography**:
  - Display Headings: `Big Shoulders Display` (Bold/ExtraBold condensed uppercase with `text-wrap: balance` and tight tracking).
  - UI & Body: `Plus Jakarta Sans` (14px–15px crisp interface legibility).
  - Numerals, Credits, Durations & IDs: `JetBrains Mono` (`tabular-nums`).

## 2. Global Chrome
- **Top Bar**: 3-zone layout:
  1. Left Brand Wordmark (`LUMEN`)
  2. Center Primary Navigation: `Explore`, `Image`, `Video`, `Audio`, `Effects`, `Community`, `Pricing`
  3. Right Action Zone: Credit Balance (`✦ 250` tabular-nums link to `/account`), `Upgrade` CTA, and User Profile Dropdown (`Assets`, `Account`, `Billing`, `Admin`, `Sign out`) or `Login` / `Sign up` modal trigger when signed out.
- **EU Cookie Consent Banner**: Non-intrusive bottom-right/bottom bar with `Accept all`, `Reject non-essential`, and `Preferences`.

## 3. Page-by-Page Inventory
- **`/` (Explore)**:
  - Atmospheric hero with subtle dot grid + radial lime glow, condensed display headline, quick surface launchers (`Image`, `Video`, `Audio`).
  - Top Models Bento showcase (Seedance 2.5, Kling 3.0 Pro, Soul 2 Standard, Flux 2 Pro, Sonilo Music v2) linking directly into `/video?model=...`, `/image?model=...`, `/audio?model=...`.
  - Curated Camera & Visual Effects strip (`/effects`) with one-click "Use Effect".
  - Public Community creations feed teaser (`/community`).
- **`/image`, `/video`, `/audio` (Studio Generators)**:
  - **Left Control Dock (380px on desktop, full width on mobile)**:
    - Mode selector tabs (`Create Video` / `Edit Video` / `Motion Control` for Video; `Create` / `Edit` for Image; `Music & Score` / `Voice & SFX` for Audio).
    - Active Model Card with animated preview, family label, model title, and `Change` button opening the searchable Model Picker Modal.
    - Reference Media & Frame Slots (`Start Frame`, `End Frame`, `References`, `Motion Source`, `Reference Audio`) enforced dynamically from the selected model's `roles` contract. Clicking opens `AssetLibraryModal` (Uploads + User Library).
    - Prompt box with character counter, sample prompt cycler, and `Enhance prompt` switch (when supported by model).
    - Settings bar showing Aspect Ratio, Duration/Resolution, and `More Settings` modal trigger (`SettingsDialog` rendering all enum, range, and boolean controls).
    - Sticky bottom `Generate ✦ {cost}` button (or `Cancel` when a queued run is active).
  - **Right Viewport Canvas**:
    - Header bar with `History` / `How it works` view switch, status filter, and grid density slider.
    - Empty state (`ScreenEmptyState`) with 3-step visual workflow guide when no runs exist.
    - Justified virtualized media grid (`UserGenerations`) with `GenerationTile` states: `queued` / `in_progress` (shimmer + live elapsed timer + cancel button), `completed` (media preview + hover action rail: Download, Reuse Prompt & Settings, Animate into Video, Publish to Community, Move to Project, Delete), `failed`, and `nsfw` ("Blocked by content filter · Credits refunded").
- **`/effects` & `/effects/[slug]`**:
  - Category filter bar (`All`, `Camera Motion`, `Visual VFX`, `Cinematic Look`, `Sonic Atmosphere`).
  - Looping visual preset cards; clicking opens the Effect Detail view with prompt template, model info, and `Use Effect in Studio` button.
- **`/community` & `/g/[id]`**:
  - Justified gallery of user-published generations. Clicking opens the Lightbox / Detail modal showing full prompt, model, settings, `Recreate in Studio` button, and `Report` action.
- **`/assets` & `/projects/[id]`**:
  - Left Projects sidebar (Create Project, Rename, Delete, All Generations, Images, Videos, Audio, Uploads).
  - Multi-select batch toolbar (Download, Move to Project, Publish/Unpublish, Delete).
- **`/pricing`**:
  - Monthly / Annual (`20% OFF`) billing cadence switch.
  - Plan tier cards (`Free`, `Starter`, `Plus`, `Ultra`) with credit allowances, parallel generation limits, and Stripe Checkout button.
  - One-time Credit Top-up packs (`Small 500`, `Medium 2,000`, `Large 6,000`) and comparison matrix.
- **`/account` & `/account/billing`**:
  - Credit bucket breakdown (`Subscription Credits` + `Top-up Credits`), append-only Credit Ledger table (`reason`, `bucket`, `delta`, `balanceAfter`, `timestamp`), active plan status, and Stripe Customer Portal trigger.
- **`/admin`**:
  - Role-gated admin console: User search & credit adjustment (`admin_adjust` ledger entry with note), Generation monitor & status filter, Model catalog enable/disable & pricing multiplier overrides, Community report moderation queue.
