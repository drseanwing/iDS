# Phase 5 — PWA + Mobile (Weeks 29–34)

> **Dependencies**: Phases 1–4 (all features must be present for offline caching and mobile optimization)
> **Goal**: Progressive Web App shell with offline reading, Capacitor wrapper for Android/iOS.
> **Deliverable**: Installable PWA with offline reading; Capacitor-wrapped native apps.

---

## 5.1 Service Worker & Offline Caching

### Task 5.1.1 — Service Worker Setup
- Install and configure `vite-plugin-pwa` (or custom service worker via Workbox):
  - Register service worker in `main.tsx`
  - Define caching strategies:
    - **App shell** (HTML, CSS, JS bundles): Cache-first, update in background
    - **API responses** (guideline data): Network-first, fall back to cache
    - **Published guideline data**: Cache-first (immutable snapshots)
    - **Static assets** (fonts, icons): Cache-first, long TTL
    - **FHIR resources**: Network-first for draft, cache-first for published
  - Configure precaching of critical app shell files during install
  - Handle service worker updates: show "New version available" toast → click to reload
  - Cache size management: limit cache to 50MB, evict oldest published guidelines first
- **Quality gate**: App loads from cache when offline; updates detected and applied
- **Tests**:
  - Disconnect network → verify app shell loads
  - Load published guideline → disconnect → verify guideline still accessible
  - Deploy update → verify update notification appears

### Task 5.1.2 — Published Guideline Offline Cache
- Implement selective offline caching for published guidelines:
  - When user views a published guideline, cache all data:
    - Guideline metadata, section tree, recommendations, PICOs, references
    - Published version snapshot (FHIR Bundle JSON)
    - PDF snapshot (if < 10MB)
  - "Save for offline" button on published guidelines → explicit cache
  - Offline indicator: show which guidelines are available offline
  - Cache invalidation: when a new version is published, mark old cache as stale → re-download when online
  - Storage quota management: show available/used space, allow user to remove cached guidelines
- **Quality gate**: Cached guidelines fully navigable offline; re-sync happens transparently
- **Tests**:
  - Cache guideline → go offline → navigate all sections and recommendations
  - Publish new version → go online → verify cache updates
  - Exceed cache limit → verify oldest evicted first

### Task 5.1.3 — IndexedDB Cache Layer for TanStack Query
- Implement persistent cache for TanStack Query:
  - Install `@tanstack/query-persist-client-plugin` + `idb-keyval` or custom IndexedDB adapter
  - Configure persistence:
    - Store query cache in IndexedDB (survives page refresh and app restart)
    - Key prefix: `opengrade-query-cache`
    - Max age: 7 days for guideline data, 1 day for user data
    - Serialize/deserialize query data (handle Dates, complex objects)
  - Hydrate cache on app startup (before first render)
  - Clear stale cache entries on startup
- **Quality gate**: App starts with previously cached data; stale entries cleaned up
- **Tests**:
  - Load data → close app → reopen → verify cached data appears immediately
  - Wait > max age → verify stale data refetched

---

## 5.2 Offline Mutation Queue

### Task 5.2.1 — Offline Mutation Queue
- Implement offline mutation support:
  - Detect online/offline state via `navigator.onLine` + event listeners
  - When offline:
    - Intercept API mutations (POST, PUT, PATCH, DELETE)
    - Store in IndexedDB queue: `{ method, url, body, timestamp, retryCount }`
    - Apply optimistic updates to local TanStack Query cache
    - Show visual indicator: "Saved locally — will sync when online"
  - When back online:
    - Process mutation queue in order (FIFO)
    - Handle conflicts: if server rejects (409), show conflict resolution UI
    - Handle failures: retry up to 3 times with exponential backoff, then surface error
    - Clear queue entries after successful sync
    - Show sync progress: "Syncing 3 of 5 changes..."
  - Conflict resolution UI:
    - Show local changes vs. server state
    - Options: Keep local, Keep server, Merge manually
- **Quality gate**: Mutations queued offline; replayed successfully when online; conflicts surfaced
- **Tests**:
  - Go offline → make edits → go online → verify edits synced to server
  - Go offline → make edits → another user edits same entity → go online → verify conflict UI appears
  - Queue multiple mutations → verify FIFO order → verify all synced

### Task 5.2.2 — Offline State Management (Zustand)
- Implement offline state store:
  - `isOnline` state (reactive)
  - `pendingMutations` count
  - `syncStatus`: idle, syncing, error, conflict
  - `cachedGuidelines[]`: list of guidelines available offline
  - `storageUsed` / `storageQuota`: cache size tracking
  - Persist to IndexedDB (Zustand persist middleware)
- Provide `useOfflineStatus()` hook for components
- **Quality gate**: State reflects actual network status; pending count accurate
- **Test**: Toggle offline → verify state updates; queue mutations → verify count

---

## 5.3 PWA Manifest & Install

### Task 5.3.1 — PWA Manifest Configuration
- Create `manifest.json` / use Vite PWA plugin:
  - `name`: "OpenGRADE"
  - `short_name`: "OpenGRADE"
  - `start_url`: "/"
  - `display`: "standalone"
  - `background_color`: "#ffffff"
  - `theme_color`: (from design tokens — primary color)
  - `icons`: 192x192, 512x512 (PNG), maskable variants
  - `screenshots`: for app store listing
  - `description`: "Open-source living guideline platform"
  - `categories`: ["medical", "productivity"]
- Create app icons in all required sizes
- Configure meta tags for iOS PWA support:
  - `apple-mobile-web-app-capable`
  - `apple-mobile-web-app-status-bar-style`
  - Apple touch icons
- **Quality gate**: Lighthouse PWA audit passes; install prompt appears on supported browsers
- **Tests**:
  - Lighthouse PWA audit score > 90
  - Chrome install prompt appears on qualifying pages
  - iOS "Add to Home Screen" works correctly

### Task 5.3.2 — Install Prompt UX
- Implement custom install prompt:
  - Intercept `beforeinstallprompt` event
  - Show custom banner/dialog: "Install OpenGRADE for the best experience"
  - Dismissible (show again after 7 days)
  - Track install state in Zustand
  - Post-install: adjust UI (hide browser chrome, use standalone layout)
- **Quality gate**: Prompt appears at appropriate time; dismissal respected; installed app works
- **Test**: Trigger install prompt → dismiss → verify 7-day cooldown; install → verify standalone mode

---

## 5.4 Capacitor Native Wrapper

### Task 5.4.1 — Capacitor Project Setup
- Initialize Capacitor in the monorepo:
  - Install `@capacitor/core`, `@capacitor/cli`
  - Initialize: `npx cap init OpenGRADE org.opengrade.app`
  - Add platforms: `npx cap add ios`, `npx cap add android`
  - Configure `capacitor.config.ts`:
    - `webDir`: points to Vite build output
    - `server.url`: dev server URL (for live reload during development)
    - Plugins configuration
- Create build scripts:
  - `pnpm run build:mobile` — builds web + syncs to native
  - `pnpm run dev:ios` — live reload on iOS simulator
  - `pnpm run dev:android` — live reload on Android emulator
- **Quality gate**: App loads in iOS Simulator and Android Emulator
- **Test**: Build → run on simulator → verify app loads and navigates

### Task 5.4.2 — Capacitor Native Plugins
- Configure native plugins:
  - **@capacitor/push-notifications**: Push notification registration and handling
    - Register for push on app start
    - Handle notification tap → deep link to relevant guideline/recommendation
    - Backend: store push token per user device
  - **@capacitor/splash-screen**: Custom splash screen
    - Design splash with OpenGRADE logo
    - Auto-hide after app shell renders
  - **@capacitor/status-bar**: Style status bar
    - Match theme color
    - Light/dark content based on current theme
  - **@capacitor/app**: Handle app lifecycle
    - Resume: trigger sync of offline mutations
    - Background: pause presence polling
  - **@capacitor/browser**: External links
    - Open DOI/PubMed links in in-app browser
  - **@capacitor/share**: Native share sheet
    - Share guideline links via native share
- **Quality gate**: All plugins initialized and functional on both platforms
- **Tests**:
  - Push notification received → verify notification appears
  - Tap notification → verify deep link navigation
  - Share guideline → verify native share sheet opens

### Task 5.4.3 — Push Notification Integration
- Backend: Add push notification infrastructure:
  - Store device push tokens in new `DevicePushToken` model (userId, platform, token, createdAt)
  - `POST /api/v1/push-tokens` — register device token
  - `DELETE /api/v1/push-tokens/:id` — unregister
  - Integrate with SubscriptionService: on `version.published` event, send push to subscribers
  - Push payload: `{ title, body, data: { guidelineId, versionId } }`
  - Use Firebase Cloud Messaging (FCM) for Android, Apple Push Notification Service (APNs) for iOS
  - Queue push delivery via Bull to handle batching and rate limiting
- Frontend: Handle push registration:
  - Request push permission on first app use (explain why)
  - Handle token refresh
  - Handle notification tap → navigate to guideline
- **Quality gate**: Push notifications delivered on both platforms; deep linking works
- **Tests**:
  - Register token → publish version → verify push received on device
  - Tap push → verify app opens to correct guideline

---

## 5.5 Mobile-Optimized Layouts

### Task 5.5.1 — Responsive Layout Refinements
- Optimize existing layouts for mobile viewports:
  - **Breakpoints** (already in place from Phase 1, now refine):
    - Desktop: > 1024px — full sidebar + content
    - Tablet: 768px–1024px — collapsible sidebar, smaller content area
    - Mobile: < 768px — bottom tab navigation, full-width content
  - **Mobile navigation**:
    - Replace sidebar with bottom tab bar (Recommendations, Evidence, References, Settings)
    - Swipeable tabs within content area
    - Collapsible top bar (shrinks on scroll)
  - **Mobile content**:
    - Section tree → fullscreen overlay panel (swipe from left)
    - Recommendation editor → stack sub-tabs vertically instead of horizontal tab bar
    - SoF table → horizontal scroll with fixed first column
    - EtD judgment grid → horizontal scroll with fixed factor column
    - Activity log → simplified card list instead of table
  - **Touch interactions**:
    - Increase tap targets to minimum 44x44px
    - Swipe gestures for section tree navigation
    - Long-press for context menus (instead of right-click)
    - Pull-to-refresh on list pages
- **Quality gate**: All features usable on mobile; no horizontal overflow; tap targets accessible
- **Tests**:
  - Navigate all pages on mobile viewport → verify no broken layouts
  - Use drag-and-drop on touch → verify works with touch events
  - Test on actual iOS and Android devices (or emulators)

### Task 5.5.2 — Mobile Public Guideline Viewer
- Optimize public guideline viewer for mobile:
  - Full-screen modals on mobile (instead of centered dialog)
  - Horizontal scrollable tabs with gradient fade indicator (matching example_spa.html pattern)
  - Touch-optimized filter chips (larger tap targets, scrollable overflow)
  - Recommendation cards → single column on mobile
  - Pictographs → responsive scaling with minimum readable size
  - Decision aid layers → full-screen transitions instead of accordion
- **Quality gate**: Public viewer is fully functional on mobile; matches native app feel
- **Test**: Navigate public viewer on mobile → verify all features accessible

---

## 5.6 Performance Optimization

### Task 5.6.1 — Bundle Size Optimization
- Optimize frontend bundle for mobile:
  - Code splitting: lazy-load route components
  - Tree shaking: verify no unused imports from large libraries
  - Dynamic imports for heavy components: TipTap editor, Recharts, react-pdf
  - Bundle analyzer: identify and address largest chunks
  - Target: initial load < 200KB gzipped
  - Image optimization: WebP format, responsive images, lazy loading
  - Font subsetting: only load used character sets
- **Quality gate**: Initial bundle < 200KB gzipped; Lighthouse performance > 90
- **Tests**:
  - Bundle analyzer shows no unexpected large dependencies
  - Lighthouse audit on mobile: performance > 90, accessibility > 90

### Task 5.6.2 — API Response Optimization for Mobile
- Optimize API responses for mobile clients:
  - Implement `?fields=` parameter for sparse fieldsets (return only requested fields)
  - Implement `?include=` parameter to control nested entity loading
  - Compress responses (gzip/brotli — configure in NestJS)
  - Add `ETag` / `If-None-Match` support for conditional requests (304 Not Modified)
  - Pagination defaults: smaller page size for mobile (10 vs. 25)
  - Add `X-Mobile` header detection for automatic optimization
- **Quality gate**: Mobile API responses are smaller; conditional requests reduce bandwidth
- **Tests**:
  - Fetch with sparse fields → verify only requested fields returned
  - Fetch with ETag → re-fetch → verify 304 response
  - Compare response sizes: full vs. sparse vs. compressed

---

## Phase 5 Summary

| Category | Count |
|----------|-------|
| Backend tasks | 3 |
| Frontend tasks | 10 |
| Total tasks | 13 |
| PWA features | 4 (service worker, manifest, install prompt, offline cache) |
| Capacitor plugins | 6 (push, splash, status-bar, app, browser, share) |
| Mobile optimizations | 3 (responsive, public viewer, performance) |

---

# Overall Project Summary (All Phases)

| Phase | Tasks | Weeks | Key Deliverable |
|-------|-------|-------|-----------------|
| Phase 0 — Infrastructure | 21 | 0 (setup sprint) | Running monorepo with all services |
| Phase 1 — Authoring MVP | 34 | 1–8 | Guideline authoring with sections, references, recommendations |
| Phase 2 — GRADE Evidence | 29 | 9–16 | Full GRADE assessment pipeline with SoF tables, EtD, decision aids |
| Phase 3 — Clinical + FHIR | 21 | 17–22 | FHIR API, clinical coding, widgets, public viewer |
| Phase 4 — Collaboration | 16 | 23–28 | COI management, voting, tasks, milestones, comments |
| Phase 5 — PWA + Mobile | 13 | 29–34 | Installable PWA with offline reading, native apps |
| **Total** | **134** | **34 weeks** | **Complete open-source MAGICapp replacement** |

### Cross-Cutting Totals

| Category | Count |
|----------|-------|
| Prisma models | 32+ (with 27 enums) |
| REST API endpoints | ~80 |
| FHIR facade endpoints | 11 |
| FHIR resource projections | 9 (Composition, PlanDefinition, Evidence, EvidenceVariable, Citation, ArtifactAssessment ×2, Provenance, AuditEvent) |
| NestJS modules | 9 (core + 8 domain) |
| Frontend feature modules | 7 |
| Shared React components | 6+ |
| TipTap extensions | 4 |
| Import parsers | 3 (RevMan, GRADEpro, RIS) |
| Export formats | 5 (PDF, DOCX, JSON, ZIP, RevMan .sof) |
| Embeddable widgets | 3 (recommendation, PICO, decision aid) |
| Docker services | 7 |
