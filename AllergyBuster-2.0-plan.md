# AllergyBuster 2.0 — Upgrade Plan

**Goal:** Grow AllergyBuster from a food allergy scanner into a product intelligence and shopping companion (Scan → Understand → Approve → Shop) **without regressing anything 1.x users rely on** (barcode scan, label photo OCR, product search, restaurant/chain lookup, Ask Jeeves, lifetime unlock).

**Pillars:** Know What's Inside · Decide What Matters · Remember What You Trust

**Status as of 2026-11-15:** v1.1.10 (build 37). Planning only, no 2.0 code yet.

---

## 0. Where the current codebase stands (gap analysis)

| 2.0 needs | Today | Gap |
|---|---|---|
| Saved allergy profile | None. Results show every detected allergen | **Must build first.** Everything personalised depends on it |
| Unified product record | `NormalizedProduct` {id, name, brand, image, allergens, ingredientsText, source} | Add category, GTIN, nutrition, additives, packaging, data completeness, snapshot hash |
| Multi-category lookup | OFF food endpoint + Edamam fallback (`productService.ts`) | Add `product_type=all` lookup, Open Beauty Facts / Open Products Facts |
| Local persistence | AsyncStorage flags only (`isPurchased`, `scanCount`, …) | A real local store for products, approvals, lists (SQLite) |
| Backend | Cloudflare Worker: tips, chains (KV), chat (Claude), establishments (D1) | Add ingredient-evidence tables, Kroger OAuth/token proxy, product cache |
| User identity | None (anonymous device) | Anonymous device ID now. Optional Sign in with Apple/Google later for sync and family plan |
| Monetisation | $7.99 lifetime, hard paywall after 5 scans gating the **whole** tab navigator (`MainGate`) | Paywall must not lock the list/pantry. See §6 |
| Navigation | Home · Scan · Photo · Search · Jeeves | Restructure (see §3) |

---

## 1. Key decisions (recommended defaults, change if you disagree)

1. **Categories: architect for all three from day one, ship in tiers.**
   - *Food & beverage*: full analysis at launch (data is strong: OFF allergens, additives, NOVA, nutrition).
   - *Personal care / cosmetics*: launch with ingredient (INCI) explanations + fragrance/sensitizer flags via Open Beauty Facts + label photo. Coverage is thinner, so the flow leans on photos.
   - *Household cleaners*: launch as **identify + label photo + disclosed-warning/fragrance flags**, labelled "Beta". US law doesn't require full ingredient disclosure for most cleaners (CA SB 258 and NY are partial exceptions), so the honest answer is often "Insufficient information".
2. **No health score.** Use only the four evidence statuses: *Documented · Potential concern · Insufficient information · Reviewed, no identified concern*. Never "toxin-free", "safe", or "chemical-free".
3. **Evidence comes from authoritative APIs and datasets, not hand-written content** (decided 2026-11-15). Household cleaners are the exception: their *product ingredient lists* are curated by hand because no product API covers them, but the hazard data for those ingredients still comes from the same sources as everything else (see §2.4). Claude only *phrases* explanations from those records and never introduces a concern that isn't in them.
4. **Flag anything toxic or harmful, always with its source.** Every ingredient goes through the hazard lookup in §2.4. A hit is shown as a hazard alert naming the classifying body ("Listed under California Prop 65 as a carcinogen", "GHS H317: may cause an allergic skin reaction (ECHA)"). One short line explains that a hazard classification describes the substance, not the dose in this product. That keeps alerts strong and also defensible in App Store review.
5. **Three separate states per product** (from your notes, kept as-is): user approval decision ≠ last analysis snapshot ≠ current info status. A product stays approved but gets flagged "Recheck needed" when its snapshot changes.
6. **Local-first.** Pantry, approvals, preferences and lists live on-device (SQLite). The server keeps only shared reference data (ingredient evidence, product cache) and retailer tokens. That keeps privacy simple and avoids account work in Phase 1.
7. **Retailer layer is capability-based.** One `RetailerConnector` interface; Kroger is the first implementation. Affiliate status never influences analysis results or ordering of "meets your preferences".
8. **Price comparison across stores: defer to Phase 4**, and decide after real Kroger data shows how reliable store-level pricing is.
9. **Release order (decided):** Phase 0 ships as **1.2**. Phase 1 ships as **2.0**. Categories launch tiered (food full, personal care full ingredient analysis, household beta).
10. **Pricing (decided):** keep lifetime unlock and add a **Plus subscription** (see §6).

---

## 2. Architecture

```
Mobile app (React Native)
 ├─ Profile & Preferences      (local)
 ├─ Product Intelligence client ── analyzers: food | personalCare | household
 ├─ Pantry (approvals, snapshots, lists)   (local SQLite)
 └─ Retailer client ───────────┐
                               ▼
Cloudflare Worker (existing, extended)
 ├─ /lookup   universal barcode → OFF/OBF/OPF/Edamam, normalised + cached (KV)
 ├─ /evidence ingredient reference + evidence (D1)
 ├─ /explain  grounded Claude explanations (existing chat infra)
 └─ /retailers/kroger/*  OAuth code exchange, token refresh, product search, cart add
```

**Why the worker handles Kroger:** the OAuth authorization-code exchange needs the client secret, which can't ship in the app. The worker stores refresh tokens (encrypted, keyed by anonymous device ID) and the app only gets short-lived access, or the worker makes the calls on the app's behalf.

### 2.1 App data model (local SQLite, mirrored types in `src/types/`)

| Table | Key fields |
|---|---|
| `allergy_profile` | allergen keys (from `ALLERGEN_TAG_MAP`), severity, include traces? (bool) |
| `user_preference` | key (additives, added_sugar, sodium, pfas_packaging, fragrance, …), enabled, threshold |
| `product` | gtin (PK), name, brand, image, category (`food`/`personal_care`/`household`), source, info_status, last_fetched |
| `product_snapshot` | gtin, ingredients_text, allergens, additives, nutrition JSON, packaging JSON, **content_hash**, captured_at, origin (`api`/`photo`) |
| `product_approval` | gtin, status (`approved`/`needs_review`/`avoid`), snapshot_id approved against, note, decided_at |
| `shopping_list` / `shopping_list_item` | list name, recurring?; item gtin, qty, checked, retailer_product_id |
| `retailer_connection` | retailer, connected_at, store/location id (no tokens on-device) |
| `retailer_product` / `retailer_offer` | gtin↔retailer SKU, URL; price, promo, availability, location, checked_at |

**Recheck rule:** if the newest snapshot's `content_hash` ≠ the hash the approval was made against → show "Recheck needed" on the pantry card and list item. Never auto-revoke and never auto-approve.

### 2.2 Server reference data (worker D1, new migrations)

- `product_category`, `ingredient_reference` (canonical name, synonyms, E-number/INCI/CAS, category scope)
- `ingredient_evidence` (ingredient_id, source_id, concern type, hazard class/code, evidence_status, severity, summary, source URL, source version/date, fetched_at)
- `evidence_source` (id, name, type `bulk`/`live`, license, refresh cadence, last_ingested_at)
- `household_product` (gtin, ingredients, disclosure URL, SDS URL, curated_by, reviewed_at): hand-curated, household cleaners only
- `retailer` (id, capabilities JSON: search, upc_match, store_price, cart_add, checkout_handoff)

`ingredient_reference` is seeded from the OFF additives/ingredients taxonomies, CosIng and the existing `ALLERGEN_KEYWORDS`. `ingredient_evidence` is filled by the ingestion jobs in §2.4, with nothing written by hand.

### 2.4 Hazard & evidence pipeline (API-based)

**Step 1: resolve each ingredient to an identity.** Normalise the label text (lowercase, strip percentages and parentheses, split on commas, map "E-numbers", INCI and common synonyms). Then resolve it to a canonical ID + **CAS number** using the OFF taxonomy → CosIng → PubChem synonym search, cached in `ingredient_reference`. Unresolved names are logged to a review queue, and the product shows them as "Insufficient information".

**Step 2: look up hazards by CAS / ID across these sources:**

| Source | What it gives | Access | Mode |
|---|---|---|---|
| Open Food Facts additives taxonomy | E-numbers, EFSA evaluations, overexposure-risk flags | API / taxonomy JSON | bulk, weekly |
| PubChem (NIH) PUG REST / PUG View | GHS hazard codes (H-statements) and signal words aggregated from ECHA and others, plus synonyms→CAS | Free, no key, rate-limited | live + cache 90 days |
| EPA CompTox (CTX) APIs | Hazard and toxicity values, DSSTox identities | Free API key | live + cache |
| California Prop 65 list (OEHHA) | Carcinogen / reproductive toxicant listings | CSV download | bulk, monthly |
| IARC Monographs classifications | Group 1 / 2A / 2B carcinogens | List download | bulk, quarterly |
| EU CosIng (Annex II banned, Annex III restricted, fragrance allergens) | Cosmetic bans, restrictions, the 26 fragrance allergens | Dataset download | bulk, quarterly |
| FDA Substances Added to Food inventory + openFDA enforcement | Regulatory status; food recalls by product | Download / openFDA API | bulk monthly; recalls daily |
| EPA Safer Choice Ingredient List | "Safer chemical" ingredients for cleaners (shown as positive context only) | Download | bulk, quarterly |
| EPA PFAS lists (CompTox PFAS master list) | Whether an ingredient is a listed PFAS | via CTX / download | bulk, quarterly |

**Step 3: assign a severity tier** (shown as alert level, never as a score):

| Tier | Triggers |
|---|---|
| **High-hazard alert** | IARC Group 1/2A, Prop 65 listed, EU Annex II (banned in cosmetics), listed PFAS, GHS acute toxicity / carcinogenicity / reproductive toxicity H-codes (H300s, H340, H350, H360) |
| **Hazard noted** | IARC 2B, GHS sensitiser or irritant (H317, H334, H315, H319), EU Annex III restricted, EU fragrance allergens, EFSA overexposure risk |
| **Matches your preferences** | User-selected preference hits (added sugar, sodium, fragrance, specific additives) |
| **No identified concern** | Resolved ingredient with no hits in any source (worded "No concerns found in [n] sources checked") |

Allergen matches from the user's profile stay a separate, always-first section, and are never mixed into hazard tiers.

**Household cleaners:** product ingredient lists come from manufacturer disclosure pages (CA SB 258 / NY requirements), SDS sheets and label photos, entered into `household_product`. Those ingredients then run through the same Steps 1–3. Evaluate the Consumer Product Information Database (CPID, commercial licence) as a way to cut the hand-entry work.

**Implementation:** a Worker Cron Trigger runs the bulk ingests into D1. Live lookups (PubChem, CTX) happen on first sight of a CAS number, with results cached and rate-limited. Each evidence row stores its source version, so when a list updates, the recheck rule (§2.1) can flag pantry products affected by it.

### 2.3 Code restructuring

- `types/product.ts` → `ProductRecord` (superset of `NormalizedProduct`; keep an adapter so existing screens keep working during migration).
- `services/productService.ts` → `lookupProduct(gtin)` calling worker `/lookup` (fall back to direct OFF/Edamam if the worker is down, as today).
- New `services/analysis/` with `analyzeFood`, `analyzePersonalCare`, `analyzeHousehold`, each returning `InsightSection[]` (Allergy Check, Ingredients & Additives, PFAS & Packaging, Nutrition, Fragrance/Warnings), every finding carrying an evidence status + source.
- `utils/ocrAllergenExtractor.ts`: keep it; add an ingredient-list extractor so photo scans produce a `product_snapshot` too.
- New `services/retailers/RetailerConnector.ts` interface + `kroger.ts`.

---

## 3. Navigation & UX

**New tabs:** Home · **Scan** (barcode / photo / search as a segmented control; merges 3 tabs) · **My Products** · **List** · Ask Jeeves

- Restaurant/chain search moves under Home ("Eating out") so it keeps working with one fewer tab.
- **Product Insights screen** replaces `ScanResultScreen` / `PhotoResultScreen` result bodies: header → Allergy Check (always first, unchanged logic) → other sections in preference order → decision bar *Approve · Needs review · Avoid · Add to list*.
- **Onboarding v2:** "What matters to you?" Allergy profile (optional, skippable for non-allergy users) + preferences toggles. Existing users get a one-time "Set up your profile" card on Home; their current behaviour (show all allergens) stays the default until they do.
- **Disclaimer update:** extend to non-food products, evidence statuses, and "approval is your choice, not a safety certification". Bump the disclaimer version so users re-accept.

---

## 4. Phased delivery

### Phase 0 — Foundations (no visible 2.0 yet; can ship as 1.2)
- [x] 0.1 Allergy profile screen + storage; Allergy Check highlights *your* allergens (others shown muted). Also fixed false positives: short keywords ("til" in tortilla/lentils/distilled → Sesame; "oat" in coat/goat) and plant butters (peanut/cocoa/shea/apple butter, butternut → Milk)
- [x] 0.2 SQLite via `@op-engineering/op-sqlite` 18.2.5 (pinned; 19.x too new). `src/storage/` = db.ts + versioned migrations (PRAGMA user_version, one transaction each) + profileStore. Schema v1: `profile` + `profile_allergen` (multi-profile ready for family plan). Phase 1 tables get added as new migrations when built. **Decision:** simple flags (`isPurchased`, `scanCount`, `onboardingSeen`, …) stay in AsyncStorage; moving purchase state carries paywall risk and gains nothing. *Native build still to be verified on device.*
- [x] 0.3 `ProductRecord` (superset of `NormalizedProduct`, so 1.x screens need no adapter): gtin, category (`food`/`personal_care`/`household`/`other` from OFF `product_type` + category tags), additives, labels, ingredients analysis, NOVA, packaging, nutrition per 100 g + per serving (incl. added sugars), data completeness, source timestamps. **Safety fixes:** Edamam ingredients now read from `foodContentsLabel` (the code read a non-existent `ingredientsText` and scanned the product *name*); products with no ingredient/allergen data now show "No Ingredient Information" instead of "No Allergens Found ✓". OFF search results now keyed by barcode (were all keyed by the query string). Barcode lookup now returns a recognised product even when no source has ingredients (shown as "No Ingredient Information"); such results don't use a free scan
- [ ] 0.4 Worker `/lookup` with KV cache and universal `product_type=all` lookup
- [ ] 0.5 Anonymous device ID (uuid in secure storage)
- [ ] 0.6 Tests: allergen parser + profile matching regression suite (protects 1.x behaviour)

### Phase 1 — Product Intelligence + Approved Pantry (= 2.0 launch)
- [ ] 1.1 Preferences screen (toggles + sugar/sodium thresholds)
- [ ] 1.2a D1 migrations (`ingredient_reference`, `ingredient_evidence`, `evidence_source`, `household_product`)
- [ ] 1.2b Ingredient normaliser + CAS resolver (OFF taxonomy → CosIng → PubChem), with an unresolved-name queue
- [ ] 1.2c Bulk ingest cron jobs: OFF additives, Prop 65, IARC, CosIng, FDA SAF, Safer Choice, EPA PFAS list
- [ ] 1.2d Live hazard lookups: PubChem GHS + EPA CTX (request key), with caching and rate limits
- [ ] 1.2e Severity tiering + `/evidence` endpoint (batch: list of ingredients → findings)
- [ ] 1.2f Licence/terms review for every source; attribution screen in-app
- [ ] 1.3 Food analyzer (allergens, hazard tiers for additives/ingredients, nutrition vs thresholds, packaging "insufficient information" by default)
- [ ] 1.4 Personal care analyzer (INCI mapping, Annex II/III, EU fragrance allergens, GHS sensitisers, label warnings)
- [ ] 1.5 Household analyzer (beta: curated `household_product` ingredients + hazard tiers, label signal words like DANGER/WARNING via OCR)
- [ ] 1.5a Household curation: admin form (extend existing `AllergyBusterWeb/admin.html`), seed top ~200 cleaner GTINs
- [ ] 1.6 Product Insights screen + decision bar
- [ ] 1.7 My Products (filter by category/status, "Recheck needed" badges)
- [ ] 1.8 Shopping lists (multiple, reusable, check-off in store)
- [ ] 1.9 Snapshot hashing + recheck detection on re-scan and background refresh of pantry items (weekly, piggyback on the existing launch-time notification reschedule)
- [ ] 1.10 Grounded `/explain` (Claude phrases curated evidence; cached per ingredient)
- [ ] 1.11 Navigation restructure + onboarding v2 + disclaimer v2
- [ ] 1.12 Paywall rework (§6), store listing/screenshots, website copy ("Know What's Inside")

### Phase 2 — Kroger
- [x] 2.1 Kroger Developer Portal registration, **Production** credentials (secrets on the Worker). Redirect URI: `https://allergybuster-tips.allergybuster-tips.workers.dev/kroger/callback`
- [~] 2.2 Worker (`worker/src/kroger.ts`): **done (tested against Production 2026-11-15, not yet deployed)**: app token (cached in KV), `GET /kroger/locations` (filters internal spoke/warehouse nodes), `GET /kroger/products` by UPC (scanned UPC-A / EAN-13 / UPC-E all match; Kroger IDs = 13-digit UPC without check digit) or term, with store price/promo/stock/aisle. **Remaining:** auth-code + PKCE flow, `/kroger/callback`, refresh-token storage, `/kroger/cart/add`
- [ ] 2.3 App: **store picker**: user chooses their Kroger store near them, by ZIP code (backed by the live `GET /kroger/locations?zip=`; optionally pre-fill ZIP from device location, already used for restaurant search). Save the chosen `locationId` locally; prices, stock and aisle in lists depend on it. Allow changing store anytime. Store choice must work *without* connecting a Kroger account (browse prices/availability first, connect only to send to cart).
- [ ] 2.3a App: connect Kroger account (in-app browser → `/kroger/callback` → deep link back to app)
- [ ] 2.4 UPC match list items → show match / no match / price & availability at selected store
- [ ] 2.5 "Send to Kroger Cart" with review screen; substitution warning ("Kroger may substitute items that aren't on your approved list")
- [ ] 2.6 Disconnect account + token revocation; privacy policy update

### Phase 3 — Multi-retailer + alternatives
- [ ] 3.1 Walmart (affiliate/product data first, outbound handoff), then Target/Amazon links per program terms
- [ ] 3.2 Alternative suggestions: same category, analysed fresh, **never inherit approval**
- [ ] 3.3 Ask Jeeves tools: query pantry, preferences and retailer search ("unscented detergent available at Kroger")

### Phase 4 — Shopping intelligence
- [ ] 4.1 Shopping history, recurring lists, price alerts
- [ ] 4.2 Recall notifications (FDA/USDA recall feeds matched to pantry GTINs). High value, relatively cheap; consider pulling it into Phase 2
- [ ] 4.3 Cross-retailer list cost comparison (decide here)
- [ ] 4.4 Verified PFAS/packaging data, manufacturer monitoring

---

## 5. Preserving 1.x (regression guardrails)

- Allergy Check logic (`allergenParser`, `ocrAllergenExtractor`, keyword maps) is reused as-is and is always the first section. Add a fixture test suite of real products before touching it.
- Lifetime unlock buyers keep everything they have now, plus Phase 1 features (grandfather them).
- Restaurant/chain/establishment features keep working; only the tab entry point moves.
- Ship Phase 0 as a 1.x release so the risky plumbing (SQLite, worker lookup) is proven before the UI changes.

---

## 6. Monetisation changes (subscription approved 2026-11-15)

The current hard gate (5 scans → whole app locked) works against a retention feature. Plan:

- **Free:** scanning limited (e.g. 5/month instead of 5 lifetime), unlimited viewing of My Products and lists you've already built, allergy profile.
- **Lifetime unlock ($7.99, existing):** unlimited scans, full analysis, unlimited pantry/lists. Grandfathered.
- **Plus subscription (new, later):** retailer integrations, recall/recheck monitoring, family profiles + sync, price alerts. These have recurring server/API cost, which a one-time $7.99 can't fund.
- Affiliate revenue as a bonus where programs allow it; keep it out of analysis logic.

---

## 7. Compliance & risk checklist

- **Data licensing:** OFF/OBF/OPF data is ODbL. Show attribution in the app; if the worker cache becomes a published/derived database, share-alike applies. Check Edamam terms for caching.
- **Health claims:** App Store and Play review health-related apps closely. Keep explanations educational, cite sources, no diagnoses, and keep the evidence-status wording consistent.
- **Kroger terms:** cart-add ≠ order; no checkout in-app; display requirements and rate limits per their ToS; cart API access is not an affiliate arrangement.
- **Privacy:** allergy profile and preferences are health-adjacent data and stay on-device. Retailer tokens are server-side, encrypted, deletable. Update privacy policy + App Store privacy labels.
- **Evidence upkeep:** evidence is API/dataset-driven, so the ongoing work is keeping ingest jobs healthy (alert on failed cron runs, stale `last_ingested_at`), clearing the unresolved-ingredient queue, and curating household products.
- **Hazard wording:** "toxic"/"harmful" alerts always name the classifying source and the classification, and never claim this product will cause harm. That keeps the strong flags while staying within App Store health-content rules and limiting liability.
- **Name-matching errors:** a wrong ingredient→CAS match is the main way to create a false alarm. Only alert on high-confidence matches (exact synonym or CAS on the label). Show lower-confidence matches as "Possible match: tap to review".

---

## 8. Decisions log

| # | Question | Decision (2026-11-15) |
|---|---|---|
| 1 | Category launch | Tiered: food full, personal care, household beta |
| 2 | Subscription | Yes: Plus tier for retailer, monitoring, family features |
| 3 | Release order | Phase 0 ships as 1.2, Phase 1 as 2.0 |
| 4 | Evidence source | API/dataset-based (§2.4). Household cleaner product data curated by hand. Flag toxic/harmful ingredients with sourced severity tiers |
