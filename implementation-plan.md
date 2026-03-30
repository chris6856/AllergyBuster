# AllergyBuster — Implementation Plan

---

## Phase 1: Project Setup

Tasks in this phase establish the foundation everything else builds on. Do not move to Phase 2 until the app boots on both iOS and Android simulators/devices.

- [ ] 1.1 Initialise React Native CLI project with TypeScript template (`npx react-native@latest init AllergyBuster --template react-native-template-typescript`)
- [ ] 1.2 Enable New Architecture — set `newArchEnabled=true` in `android/gradle.properties`, enable Hermes on both platforms
- [ ] 1.3 Install and link all core dependencies (React Navigation, Vision Camera, react-native-permissions, NetInfo, AsyncStorage, React Query, Axios, ML Kit)
- [ ] 1.4 Configure `babel.config.js` with `react-native-worklets-core` plugin
- [ ] 1.5 Create `.env` and `.env.example` with placeholders for all API keys; add `.env` to `.gitignore`; wire `config.ts` to read env vars
- [ ] 1.6 Create folder structure (`src/screens`, `src/services`, `src/components`, `src/hooks`, `src/utils`, `src/types`, `src/constants`, `src/navigation`)
- [ ] 1.7 Create `theme.ts` (colours, spacing scale, font sizes) and `allergens.ts` (canonical allergen list mapped from Open Food Facts tag format)
- [ ] 1.8 Add iOS camera permission strings to `Info.plist` (`NSCameraUsageDescription`)
- [ ] 1.9 Add Android camera permission to `AndroidManifest.xml`
- [ ] 1.10 Verify app boots and renders a blank screen on iOS and Android

---

## Phase 2: Navigation Shell & Disclaimer

Establishes the full navigation skeleton with placeholder screens. Every screen exists as a stub before any real content is built.

- [ ] 2.1 Define `navigationTypes.ts` — `RootStackParamList`, `TabParamList`, typed `useNavigation` and `useRoute` hooks
- [ ] 2.2 Create `RootNavigator.tsx` — `NativeStackNavigator` containing Disclaimer modal and MainTabs
- [ ] 2.3 Create `MainTabNavigator.tsx` — three bottom tabs (Scan, Photo, Search) plus Home as default
- [ ] 2.4 Create stub screens for all routes: `HomeScreen`, `BarcodeScanScreen`, `ScanResultScreen`, `PhotoCaptureScreen`, `PhotoResultScreen`, `TextSearchScreen`, `SearchResultScreen`
- [ ] 2.5 Wire `RootNavigator` into `App.tsx` with `QueryClientProvider` and `NavigationContainer`
- [ ] 2.6 Build `useDisclaimerAccepted` hook (AsyncStorage read/write)
- [ ] 2.7 Build `DisclaimerScreen` — static legal text, "I Understand" button, writes accepted flag, dismisses permanently
- [ ] 2.8 Wire disclaimer gate in `RootNavigator` — show modal only when flag is unset
- [ ] 2.9 Verify navigation between all stub screens works; verify disclaimer only appears on first launch

---

## Phase 3: Data Layer

All API integrations, normalisation, and hooks. Build and test services in isolation before connecting to screens.

- [ ] 3.1 Define `product.ts` types — `NormalizedProduct`, `AllergenInfo`, `Ingredient`
- [ ] 3.2 Create `http.ts` — Axios instance with `User-Agent` header interceptor for Open Food Facts
- [ ] 3.3 Build `openFoodFacts.ts` — barcode lookup (`/api/v2/product/{barcode}`) and search (`/cgi/search.pl`)
- [ ] 3.4 Build `allergenParser.ts` — strip `en:` prefix from OFF tags, title-case, map to display names, separate declared vs traces
- [ ] 3.5 Build `edamam.ts` — barcode lookup (`/parser?upc=`) and search (`/parser?ingr=`); parse ingredient text for allergen presence (do not trust health labels)
- [ ] 3.6 Build `productService.ts` — orchestrates OFF → Edamam fallback for both barcode and search; returns `NormalizedProduct | null`
- [ ] 3.7 Define `restaurant.ts` types — `Restaurant`, `MenuItem`, `RestaurantAllergenInfo`
- [ ] 3.8 Build `openMenu.ts` — search restaurants by name via OpenMenu API; extract menu items and allergen data
- [ ] 3.9 Build `yelp.ts` — search restaurants by name via Yelp Fusion API; extract menu items and allergen data
- [ ] 3.10 Build `restaurantService.ts` — orchestrates OpenMenu → Yelp fallback; returns `Restaurant | null`
- [ ] 3.11 Build `useProductByBarcode` hook — `useQuery` wrapper, handles loading / error / no-result states
- [ ] 3.12 Build `useProductSearch` hook — `useQuery` wrapper; `enabled` flag only fires on explicit submit
- [ ] 3.13 Build `useRestaurantSearch` hook — `useQuery` wrapper; `enabled` flag only fires on explicit submit
- [ ] 3.14 Build `useNetworkStatus` hook — wraps NetInfo, returns `isConnected: boolean`
- [ ] 3.15 Manually test all service calls against live APIs with sample barcodes, product queries, and restaurant name queries

---

## Phase 4: Barcode Scan Feature

- [ ] 4.1 Build `useCameraPermission` hook — checks status, requests if not determined, returns `granted | denied | blocked`
- [ ] 4.2 Build `ScannerOverlay` component — viewfinder frame cutout, torch toggle button
- [ ] 4.3 Build `BarcodeScanScreen` — Vision Camera + `useCodeScanner` for EAN-13, EAN-8, UPC-A, UPC-E, Code-128; camera only active when screen is focused (`useIsFocused`); pauses on successful scan; permission denied state with "Open Settings" deep-link
- [ ] 4.4 Build `ProductHeader` component — product name, brand, image thumbnail
- [ ] 4.5 Build `AllergenCard` component — single allergen tag with colour coding
- [ ] 4.6 Build `AllergenList` component — renders declared allergens and traces sections
- [ ] 4.7 Build `NoResultsBanner` component — "No results found" message with optional "Search Instead" CTA button
- [ ] 4.8 Build `NoNetworkBanner` component — "No network connection" message
- [ ] 4.9 Build `LoadingOverlay` component — full-screen spinner
- [ ] 4.10 Build `ScanResultScreen` — wires `useProductByBarcode`; renders loading / product / no-result / error states; "Search Instead" navigates to `TextSearchScreen` (empty query)
- [ ] 4.11 End-to-end test: scan a real barcode on a physical device → correct allergen info displayed

---

## Phase 5: Photo / OCR Feature

- [ ] 5.1 Build `PhotoCaptureScreen` — Vision Camera in photo mode, shutter button, torch toggle, permission handling (reuse `useCameraPermission`)
- [ ] 5.2 Integrate `@react-native-ml-kit/text-recognition` — one-shot call with captured image URI
- [ ] 5.3 Build `ocrAllergenExtractor.ts` — regex + keyword matching on raw OCR text; detects "Contains:", "Allergens:", bolded/caps patterns; returns `{ detected: string[], rawText: string }`
- [ ] 5.4 Build `PhotoResultScreen` — two-panel layout: detected allergens list + raw OCR text (scrollable); "Capture Again" button; "Search Instead" CTA if no text detected
- [ ] 5.5 Wire photo capture → OCR → navigate to `PhotoResultScreen` with `rawOcrText` param
- [ ] 5.6 End-to-end test: photograph a product label on a physical device → allergens extracted correctly

---

## Phase 6: Text Search Feature

- [ ] 6.1 Build `SearchSegmentedControl` component — pill-style toggle with "Products" and "Restaurants" segments; single tap switches mode; selected segment visually highlighted
- [ ] 6.2 Build `TextSearchScreen` — `SearchSegmentedControl` at top, auto-focused text input below, search submit button; accepts `initialQuery` and `initialMode` nav params; fires product or restaurant query based on active segment; only fires on explicit submit
- [ ] 6.3 Build `SearchResultScreen` for products — `FlatList` of product rows (name, brand, thumbnail); tap row navigates to `ScanResultScreen` reused as product detail (pass `productId`); empty state uses `NoResultsBanner`; skeleton loading rows
- [ ] 6.4 Build `RestaurantResultScreen` — `FlatList` of restaurant rows (name, cuisine type); tap row navigates to `RestaurantDetailScreen`
- [ ] 6.5 Build `RestaurantDetailScreen` — restaurant name, menu items list, allergen tags per item; "No allergen data available" fallback per item where API data is absent
- [ ] 6.6 Update `ScanResultScreen` to accept either `barcode` or `productId` as nav params and resolve whichever is present via `productService`
- [ ] 6.7 End-to-end test: search by product name → results → allergen detail; search by restaurant name → menu items → allergen info per item

---

## Phase 7: Daily Tips

- [ ] 7.1 Deploy minimal backend proxy (Cloudflare Worker or Vercel Edge Function) — accepts `GET /daily-tip`, calls Claude API, returns `{ tip: string, date: string }`
- [ ] 7.2 Write the AI prompt (under 80 words, practical allergy safety tip, varied daily by date)
- [ ] 7.3 Build `tipsService.ts` — checks AsyncStorage for `dailyTip:{YYYY-MM-DD}`; calls proxy if absent; stores result; falls back to previous day's tip if network fails; cleans up keys older than 7 days
- [ ] 7.4 Define `tip.ts` type — `DailyTip { text: string, date: string }`
- [ ] 7.5 Build `useDailyTip` hook — `useQuery` with `staleTime: Infinity`, `gcTime: 24h`
- [ ] 7.6 Build `TipCard` component — tip text with skeleton placeholder while loading; soft error fallback (no crash)
- [ ] 7.7 Build `HomeScreen` — `TipCard` at top, three search mode entry cards below, `NoNetworkBanner` if offline
- [ ] 7.8 End-to-end test: fresh install → tip loads and displays; close and reopen app → same tip served from cache without network call

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] 8.1 Audit every screen for missing network-offline state — show `NoNetworkBanner` consistently
- [ ] 8.2 Audit every screen for missing loading state — ensure no blank flashes
- [ ] 8.3 Audit every screen for missing error state — all `useQuery` error paths render a user-facing message with retry
- [ ] 8.4 Add "Allergen data is community-sourced — always verify on packaging" caveat to all product result screens
- [ ] 8.5 Add "For best results, hold camera flat over ingredient list in good lighting" hint to `PhotoCaptureScreen`
- [ ] 8.6 Build `ErrorBoundary` wrapper and apply to all navigator roots
- [ ] 8.7 Accessibility pass — ensure all interactive elements have `accessibilityLabel`; test with iOS VoiceOver and Android TalkBack
- [ ] 8.8 Performance pass — confirm no re-render loops; memoize heavy list components
- [ ] 8.9 Set up app icons and splash screen for both platforms
- [ ] 8.10 Define `testimonial.ts` type — `Testimonial { id, author, quote, rating, date }`
- [ ] 8.11 Create static testimonials data file (`src/constants/testimonials.ts`) with initial set of testimonials; replace with API endpoint later if needed
- [ ] 8.12 Build `TestimonialCard` component — author name, star rating, quote text
- [ ] 8.13 Build `TestimonialsCarousel` component — horizontally scrollable row of `TestimonialCard` items
- [ ] 8.14 Add `TestimonialsCarousel` to `HomeScreen` below the three search entry cards

---

## Phase 9: Testing & QA

- [ ] 9.1 Test barcode scan on physical iOS device with 10+ different product barcodes (common grocery items, products not in OFF database)
- [ ] 9.2 Test barcode scan on physical Android device with the same set
- [ ] 9.3 Test photo OCR on labels with small print, curved surfaces, and metallic packaging — document failure cases
- [ ] 9.4 Test text search with product names, brands, and ingredient terms
- [ ] 9.5 Test restaurant search with known restaurant names — verify menu items and allergen data display correctly; verify "no allergen data" fallback per item
- [ ] 9.6 Test all "no results" fallback paths for all three modes
- [ ] 9.7 Test full offline mode — disable network, open app, use all features
- [ ] 9.8 Test disclaimer — uninstall/reinstall, verify appears once only
- [ ] 9.9 Test daily tip cache — verify no duplicate proxy calls within the same day
- [ ] 9.10 Test camera permission denied flow on both platforms — verify "Open Settings" deep-link works
- [ ] 9.11 Test on minimum supported OS versions (iOS 15, Android 8)

---

## Phase Dependencies

```
Phase 1 (Setup)
  └── Phase 2 (Navigation Shell)
        └── Phase 3 (Data Layer)
              ├── Phase 4 (Barcode Scan)
              ├── Phase 5 (Photo / OCR)      ← can run parallel with Phase 4
              ├── Phase 6 (Text Search)       ← can run parallel with Phase 4 & 5
              └── Phase 7 (Daily Tips)        ← can run parallel with Phase 4, 5 & 6
                    └── Phase 8 (Polish)
                          └── Phase 9 (QA)
```
