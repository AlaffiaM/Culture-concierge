# Alaffia Cultural Concierge — Build Plan

## Stack
- **Frontend:** React 19 + Vite 8 (SPA) — Vercel
- **Backend:** Express 5 + MongoDB Atlas — Render/Railway
- **Auth:** Firebase Google OAuth
- **AI:** OpenRouter → Gemini free-tier fallback
- **Images:** Cloudinary (free tier)
- **Tracking:** Google Analytics + Hotjar

---

## ✅ Already Built (Do Not Touch)

**Frontend:** All views (Home, Cities, Spots, Happenings, Itinerary, Admin CMS), segmented Places/Happenings toggle, event strips with date/time/vibe/countdown, Live Tonight badge, vibe filter, daily pulse, Google sign-in + guest, AI itinerary form, spot detail modal, pillar filters, search bar, PWA, Vite proxy.

**Backend:** Express server, MongoDB/Mongoose, full Spot CRUD + vibe search, Event CRUD + approve/archive workflow, AI itinerary (OpenRouter), AI tag suggestions (Groq), admin stats, Firebase auth middleware.

**Seed data:** 47 spots, 28 events across 4 cities.

---

## 📋 Tasks (Do in Order)

### 1 — Fix Environment
- Create `alaffia-concierge/.env` with `VITE_FIREBASE_API_KEY`
- Replace `G-XXXXXXXXXX` in `index.html` with real Google Analytics ID
- Add `GROQ_API_KEY` to `Backend/.env`
- Remove unused `Firebase_API_KEY` typo from `Backend/.env`
- Confirm both `.env` files are gitignored

### 2 — Fix Hardcoded Itinerary Dates
- Remove `getTimeTravelerEvents()` in `routes/itinerary.js:100-149` (hardcoded NIBF May 13, Bole Afri Fest May 30)
- Replace with query to database for upcoming approved events

### 3 — Vibe & Keyword Taxonomy
- Add regional slang tags to `data.js`:
  - **Lagos:** `#SoftLife`, `#Detty`, `#Gbedu`, `#Owambe`, `#PremiumDining`
  - **Nairobi:** `#ThePlot`, `#Sundowner`, `#Sherehe`, `#Form`
  - **Kigali:** `#Cuvée`, `#Inshuti`, `#Scenic`, `#MadeInRwanda`
  - **Global:** `#Birdwatching`, `#Pottery`, `#SipAndPaint`, `#IntimateMusic`, `#PopUp`
- Accept these tags in search endpoint
- Sibling fallback: if `#Birdwatching` finds nothing → show `#Nature` results instead of "No results"

### 4 — Switch AI to Gemini (Free Tier)
- `@google/generative-ai` already installed. Use Gemini 1.5 Flash as primary AI
- Keep OpenRouter as fallback
- System prompt: "You are the Alaffia Concierge. Use only events in our database. Stay premium and concise."

### 5 — AI Prompt Enhancements
- **Vibe Match:** "Intense Culture" → pair JK Randle Centre + Amaraba Dance. "Modern Energy" → Nuvolition Fashion + Furaha Festival
- **Evening Logic:** Evening + Culture → suggest `#PerformingArts` events at 7PM with venue tip
- **Calendar Sequencing:** Order events by time. Fri→evening social, Sat→brunch+culture, Sun→wellness+brunch
- **Advisory Tips:** Auto-add tips for known spots (e.g., Lekki Conservation → "Wear comfortable sneakers")

### 6 — Image Standardization
- Create `routes/uploads.js` — Cloudinary upload endpoint
- Create `utils/imageProcessor.js` — URL transformer for smart crop 4:5 + warm filter + vignette
- Add Cloudinary creds to `Backend/.env`
- CSS warm overlay: `rgba(200,150,80,0.08)` soft-light blend

### 7 — CMS Polish
- "Approve All" batch button in `AdminEvents.jsx` review queue
- Auto-archive past events (compare `endDate` to today)
- Ghost location toggle: hides spot picker, shows coordinate inputs

### 8 — Event Scraper Pipeline (NEW)
- Create `Backend/routes/scraper.js` with 3 scraper functions:
  - `scrapeTicketsasa()` → `ticketsasa.com/events/listing/upcoming`
  - `scrapeMookh()` → `mookh.com`
  - `scrapeKenyabuzz()` → `kenyabuzz.com`
- Each extracts: name, city, date, time, venue, image
- Each found event → `POST /api/events` with `status: "draft"` (lands in review queue)
- Endpoint: `GET /api/scrape/run` triggers all 3 scrapers
- Free cron-job.org hits it daily — events auto-populate, you just approve in CMS

### 9 — GitHub Actions
- `.github/workflows/ci.yml` — runs `eslint` on push

---

## How to Test

```bash
# Start backend (terminal 1)
cd Backend; npm install; npm run dev

# Start frontend (terminal 2)
cd alaffia-concierge; npm install; npm run dev

# Test endpoints
Invoke-RestMethod http://localhost:5000/api/spots/Lagos
Invoke-RestMethod http://localhost:5000/api/events
Invoke-RestMethod http://localhost:5000/api/events/pending

# Test AI itinerary
$body = @{ city = "Lagos"; interests = "art" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/itinerary -Body $body -ContentType "application/json"

# Test approve workflow
Invoke-RestMethod -Method Put -Uri http://localhost:5000/api/events/<ID>/approve

# Test scraper
Invoke-RestMethod http://localhost:5000/api/scrape/run
```

---

## Quick Reference: Key Files

| What | Path |
|------|------|
| Main app (routing + all views) | `alaffia-concierge/src/App.jsx` |
| Firebase auth | `alaffia-concierge/src/firebase.js` |
| Static data (cities, tags, vibes) | `alaffia-concierge/src/data.js` |
| Styles | `alaffia-concierge/src/App.css` + `index.css` |
| PWA manifest | `alaffia-concierge/public/manifest.json` |
| Service worker | `alaffia-concierge/public/sw.js` |
| Backend entry | `Backend/server.js` |
| Spot routes | `Backend/routes/spots.js` |
| Event routes | `Backend/routes/events.js` |
| AI itinerary | `Backend/routes/itinerary.js` |
| AI tag suggestions | `Backend/routes/ai.js` |
| Scraper (to build) | `Backend/routes/scraper.js` |
| Admin middleware | `Backend/middleware/admin.js` |
| Spot model | `Backend/models/Spot.js` |
| Event model | `Backend/models/Event.js` |
| Seed spots | `Backend/seed.js` |
| Seed events | `Backend/seed-events.js` |
