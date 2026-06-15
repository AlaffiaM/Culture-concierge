# Alaffia Cultural Concierge — Build Roadmap

## Architecture

```
Frontend: React 19 + Vite 8 (SPA)
Backend:  Express 5 + MongoDB Atlas
Auth:     Firebase Authentication (Google OAuth)
AI:       OpenRouter (Mistral Large) + Gemini free-tier fallback
Images:   Cloudinary (free tier — smart cropping, warm filter)
Deploy:   Frontend → Vercel | Backend → Render/Railway
```

---

## ✅ Already Built (No Changes Needed)

### Database Schema
| Model | Path | Key Features |
|---|---|---|
| `Event` | `Backend/models/Event.js` | `status` (draft/approved/archived), `isGhostLocation`, `linkedSpotId` (ref→Spot), always-required `coordinates`, `tags[]`, `vibe`, `pillar` |
| `Spot` | `Backend/models/Spot.js` | `vibeTags[]`, `pillar`, `coordinates`, `status` (active/inactive) |

### API Endpoints (Backend)
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/spots` | All spots |
| `GET` | `/api/spots/:city` | Spots by city |
| `GET` | `/api/spots/vibes/:city` | Vibe-filtered spots |
| `GET` | `/api/spots/upcoming/:city` | Spots with upcoming events |
| `GET` | `/api/events` | Approved events (filterable by city) |
| `GET` | `/api/events/upcoming` | Future approved events (limit 20) |
| `GET` | `/api/events/pending` | Review queue — all draft events |
| `GET` | `/api/events/today` | Today's events (for Live Tonight badge) |
| `GET` | `/api/events/:id` | Single event |
| `POST` | `/api/events` | Create event (defaults to `draft`) |
| `PUT` | `/api/events/:id` | Update event |
| `PUT` | `/api/events/:id/approve` | Set status → `approved` |
| `PUT` | `/api/events/:id/archive` | Set status → `archived` |
| `DELETE` | `/api/events/:id` | Delete event |
| `POST` | `/api/itinerary` | AI itinerary generation |
| `POST` | `/api/ai/suggest-tags` | AI tag suggestions via Groq |

### Frontend Features
| Feature | File | Details |
|---|---|---|
| Segmented control (Places/Happenings) | `App.jsx:394-399` | Toggle view switcher |
| Event strips (Happenings view) | `App.jsx:570-595` | Slim cards: date, time, vibe, ghost tag |
| "Live Tonight" badge | `App.jsx:479` | Shows on spot cards with today events |
| Vibe filter chips | `VibeSearch.jsx` | 6 vibes: Premium, Chic, Serene, Intimate, Vibrant, Curated |
| Mood presets (itinerary) | `VibeSearch.jsx:33-51` | 6 mood buttons with pre-written queries |
| Daily Pulse | `App.jsx:14-26` | Day-of-week recommendations |
| Countdown timer | `App.jsx:28-37` | Shows `Xd`, `Xh`, `Xm` until event |
| Google Sign-In | `firebase.js` | Popup auth + state listener |
| Guest mode | `App.jsx:93-96` | Skip auth, browse freely |
| Spot detail modal | `SpotDetailModal.jsx` | Bottom sheet with linked events |
| Itinerary view | `ItineraryView.jsx` | Parsed 2-day plan with time slots |
| Pillar filters (All/Culture/Wellness/Social) | `App.jsx:423-436` | Category toggle |
| Search bar | `App.jsx:404-413` | Filter by name, details, tags |
| PWA support | `public/sw.js`, `manifest.json` | Offline, add-to-home-screen |
| Vite dev proxy | `vite.config.js` | `/api` → `localhost:5000` |

### Seed Data
- **47 spots** across Lagos (15), Abuja (12), Kigali (7), Nairobi (12)
- **28 events** (approved, draft, archived statuses)
- Seed scripts: `Backend/seed.js`, `Backend/seed-events.js`

---

## 🆕 What to Build (5 Phases)

### Phase 1 — Full CMS Dashboard

#### New Files (11)
```
alaffia-concierge/src/
├── AdminDashboard.jsx       — Main layout + tab navigation
├── AdminDashboard.css       — Admin styles
├── AdminOverview.jsx        — Analytics widgets
├── AdminEvents.jsx          — Events table + CRUD
├── AdminSpots.jsx           — Spots table + CRUD
├── AdminTags.jsx            — Tag taxonomy manager
├── AdminSettings.jsx        — Admin user list
├── EventEditor.jsx          — Create/edit event form
├── EventEditor.css          — Editor styles
├── SpotEditor.jsx           — Create/edit spot form
└── SpotEditor.css           — Editor styles

Backend/
├── routes/admin.js          — Stats + tags CRUD endpoints
├── middleware/admin.js      — Firebase admin auth check
└── utils/taxonomy.js        — Seed tag data
```

#### Modified Files (4)
| File | Changes |
|---|---|
| `App.jsx` | Add admin view/route, admin header link |
| `App.css` | Add admin layout styles |
| `server.js` | Mount admin routes + middleware |
| `routes/spots.js` | Add POST/PUT/DELETE endpoints |

#### Key Features
- **Overview tab:** Total events, pending count, city breakdown, events this week
- **Events tab:** Filterable table (status, city, date), approve/archive/edit/delete, bulk actions
- **Event editor:** All fields, ghost toggle (hides spot linker), auto-tag button (`/api/ai/suggest-tags`), map coordinate inputs
- **Spots tab:** Table with filters, create/edit/delete, linked event count
- **Tags tab:** Category management + regional slang CRUD
- **Settings tab:** Admin email management
- **Auth:** Protected by Firebase email allowlist (`ADMIN_EMAILS` env var)

---

### Phase 2 — Enhanced Search & Keyword Taxonomy

#### New Files (0) — modifies existing

#### Modified Files (4)
| File | Changes |
|---|---|
| `data.js` | Add taxonomy: categories, regional slang, sibling tag map |
| `App.jsx` | Sibling tag fallback in search (no birdwatching → suggest Nature Retreat) |
| `routes/spots.js` | Accept regional slang (#SoftLife, #ThePlot) as vibe queries |
| `routes/ai.js` | Enhanced tag suggestion using taxonomy |

#### Keyword Taxonomy Structure

**Categories:** Wellness, Art & Creativity, Dining, Music (Intimate), Cultural & Arts, Niche/Outdoors

**Regional Slang:**
| Region | Tags |
|---|---|
| Lagos | `#SoftLife`, `#Detty`, `#Gbedu`, `#Owambe`, `#Outside`, `#PremiumDining`, `#EkoGlam`, `#Vawulence` |
| Nairobi | `#ThePlot`, `#Sundowner`, `#Sherehe`, `#Form`, `#NyamaChoma`, `#VibeYa254`, `#Kutano` |
| Kigali | `#Cuvée`, `#Inshuti`, `#Scenic`, `#MadeInRwanda`, `#KigaliLife`, `#Degustation` |
| Global | `#Birdwatching`, `#Pottery`, `#SipAndPaint`, `#IntimateMusic`, `#PopUp`, `#SecretLocation` |

**Tiered Tagging System:**
| Tier | Category | Example |
|---|---|---|
| 1 | Core Interest | Wine, Vineyard, Tasting, Art, Wellness |
| 2 | Event Format | Festival, Pop-up, Brunch, Sundowner, Workshop |
| 3 | Regional Specific | #SoftLife (Lagos), #ThePlot (Nairobi) |
| 4 | Affluence Filter | Premium, Exclusive, VIP, Curated, Limited |

**Sibling Tag Fallback Logic:**
```
birdwatching → No results
    ↓
Check sibling category: Outdoors
    ↓
Fallback: "No birdwatching today, but we found a Nature Retreat in the Ngong Hills that you might love."
```

---

### Phase 3 — Image Standardization (Cloudinary)

#### New Files (2)
```
Backend/
├── routes/uploads.js         — Cloudinary upload endpoint
└── utils/imageProcessor.js   — URL transformation builder
```

#### Modified Files (2)
| File | Changes |
|---|---|
| `App.css` | CSS warm overlay (`::after` pseudo-element) |
| `Backend/.env` | Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |

#### Cloudinary URL Transformations
```
// Smart crop to 4:5, detect subject, warm tone, vignette
https://res.cloudinary.com/CLOUD_NAME/image/upload/
c_thumb,g_auto/
ar_4:5/
e_improve/
e_vignette:40/
e_saturation:-10/
q_auto:good/
f_auto/
v123/sample.jpg
```

#### CSS Warm Overlay (Fallback)
```css
.event-image-wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(200, 150, 80, 0.08);
  mix-blend-mode: soft-light;
  pointer-events: none;
}
```

#### Flyer Detection
- Option A: Cloudinary `e_art:zorro` or AI text detection (future)
- Option B: Manual "Blur Overlay" toggle in CMS event editor (MVP)

---

### Phase 4 — Calendar-Fueled AI Itinerary

#### Modified Files (1)
| File | Changes |
|---|---|
| `Backend/routes/itinerary.js` | Enhanced prompt, Gemini fallback, remove hardcoded events |

#### Enhanced System Prompt
```
You are the Alaffia Concierge, a premium cultural travel assistant for Africa.
Use ONLY the events in our database below. Do not invent events.
Stay premium, warm, and concise.

If today is Friday in Lagos, suggest a time-ordered sequence:
"Start with the 6 PM Jazz Session at The Jazz Lounge, then the Art Opening at 8 PM at Terra Kulture."
```

#### Calendar Sequencing Logic
- Order events by time within each day
- If day=Friday: prioritize evening social → live music → nightlife
- If day=Saturday: prioritize brunch → afternoon culture → evening dining
- If day=Sunday: prioritize wellness → brunch → afternoon arts

#### Gemini Free-Tier Fallback
- Package already in `package.json`: `@google/generative-ai`
- Model: `gemini-2.0-flash` (free tier, sufficient for <100 users)
- Fallback chain: OpenRouter → Gemini → Hardcoded fallback

#### Remove Hardcoded Time-Traveler Events
- Delete `getTimeTravelerEvents()` in `itinerary.js:100-149`
- Replace with DB query for upcoming events (already exists at line 319)

---

### Phase 5 — Ghost Location UX & UI Polish

#### Modified Files (2)
| File | Changes |
|---|---|
| `App.jsx` | Ghost card emphasis, landing copy alignment |
| `App.css` | Ghost location styles, event strip polish |

#### Ghost Location UX Rules
- Ghost event cards: Show map pin icon instead of venue name
- Always display `#PopUp` or `#SecretLocation` tag prominently
- Description text takes priority over venue history
- CMS editor: Ghost toggle hides "Linked Spot" dropdown, shows coordinate inputs

#### Landing Page Copy
```
Welcome to The Culture Concierge

Sign in to access curated recommendations, insider experiences, and
intelligent cultural guides across Lagos, Kigali, Nairobi, and Abuja.

[ Sign in with Google ]
[ Continue as guest ]
```

---

## 🗑️ What to Remove / Refactor

| Item | Location | Action |
|---|---|---|
| Hardcoded time-traveler events | `Backend/routes/itinerary.js:100-149` | **Remove** — replace with DB-driven events query |
| Duplicate Firebase key (typo) | `Backend/.env:Firebase_API_KEY` | **Remove** — unused, frontend key is correct |
| Supabase credentials | User's memo (not in code) | **Discard** — not used in this architecture |
| Next.js architecture | User's memo (not in code) | **Ignore** — keeping Vite + Express |
| Google Analytics placeholder | `index.html:35,40` | Replace `G-XXXXXXXXXX` with real GA ID |

---

## 📁 Full File Manifest

### Files to Keep (No Changes) — 19 files
```
Frontend:
├── src/ItineraryView.jsx, .css
├── src/SpotDetailModal.jsx, .css
├── src/VibeSearch.jsx
├── src/firebase.js
├── src/main.jsx
├── src/index.css
├── src/assets/Alaffia Logo New.png
├── index.html
├── vite.config.js
├── eslint.config.js
├── vercel.json
├── public/favicon.svg, icons.svg, manifest.json, sw.js
└── package.json

Backend:
├── models/Event.js, Spot.js
└── package.json
```

### Files to Create — 17 new files
```
Frontend (11):
├── src/AdminDashboard.jsx, .css
├── src/AdminOverview.jsx
├── src/AdminEvents.jsx
├── src/AdminSpots.jsx
├── src/AdminTags.jsx
├── src/AdminSettings.jsx
├── src/EventEditor.jsx, .css
└── src/SpotEditor.jsx, .css

Backend (6):
├── routes/admin.js
├── routes/uploads.js
├── middleware/admin.js
├── utils/taxonomy.js
└── utils/imageProcessor.js
```

### Files to Modify — 8 files
```
├── alaffia-concierge/src/App.jsx
├── alaffia-concierge/src/App.css
├── alaffia-concierge/src/data.js              (Phase 2)
├── Backend/server.js
├── Backend/routes/spots.js
├── Backend/routes/events.js
├── Backend/routes/itinerary.js                (Phase 4)
└── Backend/routes/ai.js
```

---

## 🎯 Build Order (6 Sprints)

| Sprint | Phase | Focus | Key Deliverable | Est. Effort |
|---|---|---|---|---|
| 1 | Phase 1.1 | CMS — Events | AdminDashboard + AdminEvents + EventEditor + Review Queue | 5-7 days |
| 2 | Phase 1.2 | CMS — Spots + Tags | AdminSpots + AdminTags + Taxonomy CRUD | 3-4 days |
| 3 | Phase 2 | Keyword Search | Regional slang search + sibling tag fallback | 3-4 days |
| 4 | Phase 3 | Image Standardization | Cloudinary upload + warm filter + smart crop | 3-4 days |
| 5 | Phase 4 | AI Itinerary v2 | Calendar sequencing + Gemini fallback + prompt hardening | 3-4 days |
| 6 | Phase 5 | Ghost UX + Polish | Ghost cards, landing copy, final styling | 2-3 days |

**Total estimated effort: 19-26 days**

---

## Environment Variables

### Backend (`Backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb+srv://...
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=mistral-large
GROQ_API_KEY=gsk_...
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
ADMIN_EMAILS=admin@example.com,curator@example.com
```

### Frontend (`alaffia-concierge/.env`)
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_API_URL=                          # empty for dev proxy
```

---

## Event Vetting Workflow (Data Flow)

```
Scraper/Zapier/Make.com
        │
        ▼
  POST /api/events ───────────► status: "draft"
        │
        ▼
  Admin Dashboard
  (Review Queue)
        │
        ├── [Approve] ────────► status: "approved" → visible on frontend
        │
        └── [Reject/Delete] ──► Removed from queue
        │
  ┌─────┴─────┐
  │            │
  ▼            ▼
Live App    Expired date
                │
                ▼
        Auto-archived (cron or on read)
```

---

## Image Processing Flow

```
User uploads flyer (CMS)
        │
        ▼
  POST /api/uploads ──────────► Cloudinary upload
        │                           │
        ▼                           ▼
  Return URL              Apply transformations:
                          1. Smart crop (c_thumb,g_auto)
                          2. Aspect ratio 4:5
                          3. Warm filter (e_improve + e_saturation:-10)
                          4. Vignette (e_vignette:40)
        │
        ▼
  Store URL in Event.imageUrl
        │
        ▼
  Frontend renders with CSS warm overlay
```

---

## AI Itinerary Flow

```
User clicks "Generate AI Itinerary"
        │
        ▼
  POST /api/itinerary { city, interests }
        │
        ▼
  Fetch spots (city-filtered)
  Fetch approved events (upcoming, city-filtered)
  Get daily pulse (day-of-week awareness)
        │
        ▼
  Build prompt with:
  - System identity ("You are the Alaffia Concierge")
  - Database spots + events
  - Daily pulse context
  - Interest mapping rules
  - Calendar sequencing rules
        │
        ▼
  Try OpenRouter → Fallback to Gemini → Fallback to hardcoded
        │
        ▼
  Return formatted 2-day itinerary
```

---

## How to Get Events from External Sources

Three approaches to pull event data from sites like Ticketsasa, Mookh, Kenyabuzz:

### Option 1 — Make.com / Zapier (No-Code, Recommended)

Set up a free Zapier/Make.com workflow:

```
Event website (Ticketsasa, etc.) → RSS feed or page change detected
        │
        ▼
  Make.com/Zapier reads the new event
        │
        ▼
  POST /api/events to your backend
  → status: "draft" automatically
        │
        ▼
  You open Admin Dashboard → hit [Approve]
```

**Setup effort:** ~30 minutes per site. No code needed.

### Option 2 — Web Scraper Script (Code)

New file: `Backend/routes/scraper.js`

Scrapes event sites and pushes them into the review queue:

| Site | URL | What to scrape |
|---|---|---|
| Ticketsasa | `ticketsasa.com/events/listing/upcoming` | Event name, date, city, venue, image |
| Mookh | `mookh.com` | Event listings, dates, location |
| Kenyabuzz | `kenyabuzz.com` | Nairobi events, time, venue |

```
Backend/routes/scraper.js
  ├── scrapeTicketsasa()   — parse HTML, extract events
  ├── scrapeMookh()        — parse HTML, extract events
  ├── scrapeKenyabuzz()    — parse HTML, extract events
  └── POST /api/scrape/run — trigger manually or via cron
```

Each extracted event → `POST /api/events` → status `draft`.

**Cron job:** Use a free cron service (cron-job.org) to hit `/api/scrape/run` daily.

### Option 3 — Manual CSV Import (Admin CMS)

Add a "Bulk Import" button in the CMS Admin that accepts a CSV:

```csv
name, city, date, time, type, description, tags, coordinates_lat, coordinates_lng
"The Grape Escape", Lagos, 2026-06-15, 4pm-9pm, Wine Tasting, Premium wine event..., "#Wine,#SoftLife", 6.5244, 3.3792
```

### Recommendation for MVP

**Start with Option 1 (Make.com)** for the 3 East African sites (Ticketsasa, Mookh, Kenyabuzz) — zero code, free tier handles it.

Then **build Option 2 (Scraper)** as a reusable script for any future sites you want to add without configuring Zapier each time.

The end result is the same either way: new events land in the **Review Queue** as `draft`, and you approve them with one click in the CMS.
```
