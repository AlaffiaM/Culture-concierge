import { useState, useEffect, useRef } from "react";
import alaffiaLogo from "./assets/Alaffia Logo New.png";
import { cities } from "./data";
import { auth, provider, signInWithPopup, signOut } from "./firebase";
import CityCards from "./CityCards";
import SpotsView from "./SpotsView";
import HappeningsView from "./HappeningsView";
import TravelBrief from "./TravelBrief";
import { MoodPresets } from "./VibeSearch";
import ItineraryView from "./ItineraryView";
import SpotDetailModal from "./SpotDetailModal";
import AdminDashboard from "./admin/AdminDashboard";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_URL || "";
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
function getDailyPulse() {
  const day = new Date().getDay();
  const dayName = DAY_NAMES[day];
  let pulse = "", icon = "✦";
  if (day === 6) { pulse = "Farmers markets & Sip & Paint"; icon = "🎨"; }
  else if (day === 1) { pulse = "Spas, quiet cafes & low-key wellness"; icon = "🧘"; }
  else if (day === 0) { pulse = "Brunch spots, retreats & afternoon culture"; icon = "☀️"; }
  else if (day === 5) { pulse = "Evening social spots & live music"; icon = "🎵"; }
  else if (day === 4) { pulse = "Art shows, gallery walks & cultural nights"; icon = "🎭"; }
  else if (day === 3) { pulse = "Mid-week spa escapes & book cafes"; icon = "📚"; }
  else if (day === 2) { pulse = "Creative workshops & hidden gems"; icon = "✨"; }
  return { dayName, pulse, icon };
}

function countdownTo(dateStr) {
  const diff = new Date(dateStr) - new Date();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor(diff / 60000);
  return `${mins}m`;
}

function gtag(...args) {
  if (typeof window !== "undefined" && window.gtag) window.gtag(...args);
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const hasNavigatedFromHome = useRef(false);
  const [view, setView] = useState("home");
  const [selectedCity, setSelectedCity] = useState(null);
  const [interests, setInterests] = useState("");
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allSpots, setAllSpots] = useState([]);
  const [filteredSpots, setFilteredSpots] = useState([]);
  const [events, setEvents] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePillar, setActivePillar] = useState(null);
  const [activeVibes, setActiveVibes] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [viewMode, setViewMode] = useState("places");
  const [advisory, setAdvisory] = useState(null);
  const [spotsError, setSpotsError] = useState(null);
  const [authError, setAuthError] = useState(null);

  const { dayName, pulse: dailyPulseText, icon: dailyIcon } = getDailyPulse();

  const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase())

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        gtag("event", "sign_in");
        if (!hasNavigatedFromHome.current) setView("cities");
        hasNavigatedFromHome.current = false;
      }
    });
    return unsubscribe;
  }, []);

  async function handleGoogleSignIn() {
    setAuthError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      if (e.code === "auth/popup-closed-by-user") return;
      setAuthError(e.message || "Sign-in failed. Please try again.");
    }
  }

  async function handleSignOut() {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (e) {
      setAuthError(e.message || "Sign-out failed.");
      return;
    }
    setUser(null);
    setView("home");
    hasNavigatedFromHome.current = true;
    gtag("event", "sign_out");
  }

  useEffect(() => {
    const cached = sessionStorage.getItem('alaffia_spots')
    if (cached) {
      try { setAllSpots(JSON.parse(cached)) } catch {}
    }

    fetch(API_BASE + "/api/spots")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setAllSpots(data)
        setSpotsError(null)
        sessionStorage.setItem('alaffia_spots', JSON.stringify(data))
      })
      .catch((err) => {
        console.error('[spots] Fetch failed:', err.name, err.message, err.cause || '')
        setSpotsError(`Could not load spots. Try again. (${err.name}: ${err.message})`)
      })
  }, []);

  useEffect(() => {
    if (!selectedCity) return;
    setViewMode("places");
    setActiveVibes([]);
    setAdvisory(null);
    fetch(`${API_BASE}/api/events/upcoming?city=${selectedCity}`)
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch(() => {});
    fetch(`${API_BASE}/api/events/today?city=${selectedCity}`)
      .then((res) => res.json())
      .then((data) => setTodayEvents(data))
      .catch(() => {});
    const city = cities.find(c => c.name === selectedCity)
    if (city) {
      fetch(`${API_BASE}/api/advisories/${city.name}`)
        .then((res) => { if (res.ok) return res.json(); throw new Error() })
        .then((data) => setAdvisory(data))
        .catch(() => {})
    }
  }, [selectedCity]);

  useEffect(() => {
    if (!selectedCity) return;
    const citySpots = allSpots.filter((s) => s.city && s.city.toLowerCase() === selectedCity.toLowerCase());

    let spots = citySpots;

    if (activeVibes.length > 0) {
      const lowerVibes = activeVibes.map((v) => v.toLowerCase());
      spots = spots
        .map((s) => {
          const matchCount = (s.vibeTags || []).filter((t) =>
            lowerVibes.includes(t.toLowerCase())
          ).length;
          return { ...s, vibeScore: matchCount };
        })
        .filter((s) => s.vibeScore > 0)
        .sort((a, b) => b.vibeScore - a.vibeScore);
    }

    if (searchQuery && searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      spots = spots.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.details && s.details.toLowerCase().includes(q)) ||
          (s.vibeTags && s.vibeTags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    if (activePillar) {
      spots = spots.filter((s) => s.pillar === activePillar);
    }

    setFilteredSpots(spots);
  }, [selectedCity, allSpots, activeVibes, searchQuery, activePillar]);

  useEffect(() => {
    if (!selectedCity || activeVibes.length === 0) return;
    gtag("event", "vibe_search", { city: selectedCity, vibes: activeVibes.join(",") });
  }, [activeVibes, selectedCity]);

  function handleSelectCity(city) {
    setSelectedCity(city);
    setView("spots");
    setItinerary(null);
    setInterests("");
    setActiveVibes([]);
    setSearchQuery("");
    gtag("event", "select_city", { city });
  }

  function handleBack() {
    setView("cities");
    setSelectedCity(null);
    setItinerary(null);
    setInterests("");
    setActiveVibes([]);
    gtag("event", "back_to_cities");
  }

  function handleBackToSpots() {
    setView("spots");
    setItinerary(null);
    setInterests("");
    gtag("event", "back_to_spots");
  }

  function handleToggleVibe(vibe) {
    setActiveVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  }

  function handleMoodSelect(query) {
    setInterests(query);
  }

  async function handleGenerateItinerary() {
    if (!interests.trim()) return;
    setLoading(true);
    gtag("event", "generate_itinerary", { city: selectedCity });

    try {
      const res = await fetch(API_BASE + "/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: selectedCity, interests: interests.trim() }),
      });
      const data = await res.json();
      setItinerary(data.itinerary);
    } catch (err) {
      console.error('[itinerary] Generate failed:', err.message)
    } finally {
      setLoading(false);
    }
  }

  function handleSpotClick(spot) {
    setSelectedSpot(spot);
  }

  const todaySpotIds = new Set(
    todayEvents.filter((e) => e.linkedSpotId).map((e) => e.linkedSpotId._id)
  );

  if (authLoading) {
    return (
      <div className="app-loading-screen">
        <img src={alaffiaLogo} alt="Alaffia" className="app-loading-logo" />
        <div className="app-loading-spinner" />
      </div>
    )
  }

  return (
    <div className="app">
      {view !== "home" && view !== "admin" && (
        <header className="header">
          <div className="logo">
            {view !== "cities" && (
              <button
                className="back-btn"
                onClick={view === "itinerary" && itinerary ? handleBackToSpots : handleBack}
                aria-label="Go back"
              >
                Back
              </button>
            )}
            <img src={alaffiaLogo} alt="Alaffia" className="logo-img" />
          </div>
          <div className="user-area">
            {user ? (
              <>
                {user.photoURL && <img src={user.photoURL} alt="" className="user-avatar" />}
                <span className="user-name">{user.displayName || "User"}</span>
                {isAdmin && view !== "admin" && (
                  <button className="btn-text" onClick={() => setView("admin")} style={{ borderColor: "var(--sage)" }}>Admin</button>
                )}
                {isAdmin && view === "admin" && (
                  <button className="btn-text" onClick={handleBack}>App</button>
                )}
                <button className="btn-text" onClick={handleSignOut}>Sign out</button>
              </>
            ) : (
              <button className="btn-text" onClick={handleGoogleSignIn}>Sign in</button>
            )}
            {authError && <span className="auth-error">{authError}</span>}
          </div>
          {view === "cities" ? (
            <>
              <p className="subtitle">Cultural Concierge</p>
              <p className="tagline">
                Your AI-powered cultural concierge for discovering wellness, creativity, and elevated experiences across Africa&rsquo;s most dynamic cities &mdash; Lagos, Kigali, Nairobi and Abuja.
              </p>
            </>
          ) : view !== "admin" ? (
            <p>{selectedCity}</p>
          ) : null}
        </header>
      )}

      {view !== "admin" && (
        <main className="main">
          <div key={view + (selectedCity || "")} className="view-enter">
          {view === "home" && (
            <div className="home-page">
              <div className="home-hero">
                <img src={alaffiaLogo} alt="Alaffia" className="home-logo" />
                <h1 className="home-title">Cultural Concierge</h1>
                <p className="home-tagline">
                  Discover wellness, creativity, and elevated experiences across Africa&rsquo;s most dynamic cities.
                </p>
              </div>
              <div className="home-actions">
                <button className="btn btn-primary btn-full" onClick={handleGoogleSignIn}>
                  Sign in with Google
                </button>
                {authError && <p className="auth-error">{authError}</p>}
              </div>
            </div>
          )}

          {view === "cities" && (
            <div className="daily-pulse">
              <span className="daily-pulse-icon">{dailyIcon}</span>
              <div className="daily-pulse-text">
                <span className="daily-pulse-day">{dayName}</span>
                <span className="daily-pulse-rec">{dailyPulseText}</span>
              </div>
            </div>
          )}

          {view === "cities" && (
            <>
              <h2 className="section-title">Choose your city</h2>
              <CityCards allSpots={allSpots} onSelectCity={handleSelectCity} />
            </>
          )}

          {view === "spots" && (
            <>
              <div className="daily-pulse">
                <span className="daily-pulse-icon">{dailyIcon}</span>
                <div className="daily-pulse-text">
                  <span className="daily-pulse-day">{dayName}</span>
                  <span className="daily-pulse-rec">{dailyPulseText}</span>
                </div>
              </div>

              <div className="city-hero">
                <h2 className="city-hero-name">{selectedCity}</h2>
                <span className="city-hero-country">
                  {cities.find((c) => c.name === selectedCity)?.country}
                </span>
              </div>

              <div className="spots-header">
                <div className="segmented-control">
                  <button className={viewMode === "travelbrief" ? "active" : ""} onClick={() => setViewMode("travelbrief")}>&#x1F6F0;&#xFE0F; Travel Brief</button>
                  <button className={viewMode === "places" ? "active" : ""} onClick={() => setViewMode("places")}>&#x1F5FA;&#xFE0F; Places</button>
                  <button className={viewMode === "happenings" ? "active" : ""} onClick={() => setViewMode("happenings")}>
                    &#x1F4C5; Happenings{events.length > 0 ? ` (${events.length})` : ""}
                  </button>
                </div>
              </div>

              {viewMode === "places" && (
                <SpotsView
                  selectedCity={selectedCity}
                  todayEvents={todayEvents}
                  events={events}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeVibes={activeVibes}
                  onToggleVibe={handleToggleVibe}
                  activePillar={activePillar}
                  onPillarChange={setActivePillar}
                  filteredSpots={filteredSpots}
                  allSpots={allSpots}
                  spotsError={spotsError}
                  onSpotClick={handleSpotClick}
                  onGenerateItinerary={() => setView("itinerary")}
                  todaySpotIds={todaySpotIds}
                  countdownTo={countdownTo}
                />
              )}

              {viewMode === "happenings" && (
                <HappeningsView
                  events={events}
                  allSpots={allSpots}
                  selectedCity={selectedCity}
                  activePillar={activePillar}
                  onPillarChange={setActivePillar}
                  onGenerateItinerary={() => setView("itinerary")}
                  countdownTo={countdownTo}
                />
              )}

              {viewMode === "travelbrief" && (
                <TravelBrief
                  advisory={advisory}
                  selectedCity={selectedCity}
                />
              )}
            </>
          )}

          {view === "itinerary" && !itinerary && (
            <div className="itinerary-form">
              <h2 className="section-title">Your {selectedCity} Itinerary</h2>
              <p className="form-desc">Tell us what you're into — we'll craft a 2-day plan.</p>

              <MoodPresets onSelect={handleMoodSelect} disabled={loading} />

              <textarea
                className="form-input"
                placeholder="e.g. art, culture, relaxation, good food..."
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                rows={3}
              />
              <button
                className="btn btn-primary btn-full"
                onClick={handleGenerateItinerary}
                disabled={loading || !interests.trim()}
              >
                {loading ? "Generating..." : "Generate My Itinerary"}
              </button>
            </div>
          )}

          {view === "itinerary" && loading && (
            <div className="iti-loading">
              <div className="iti-spinner" />
              <p>Crafting your cultural journey...</p>
            </div>
          )}

          {view === "itinerary" && itinerary && !loading && (
            <ItineraryView
              itinerary={itinerary}
              city={selectedCity}
              spots={allSpots.filter((s) => s.city === selectedCity)}
              events={events}
              onBack={handleBackToSpots}
            />
          )}

        </div>
        </main>
      )}

      {view === "admin" && <AdminDashboard onBackToApp={handleBack} user={user} />}

      {view !== "admin" && selectedSpot && (
        <SpotDetailModal
          spot={selectedSpot}
          events={events}
          onClose={() => setSelectedSpot(null)}
        />
      )}

      {view !== "admin" && (
        <footer className="footer">Alaffia Cultural Concierge &copy; 2026</footer>
      )}
    </div>
  );
}

export default App;
