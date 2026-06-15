import { VibeFilter } from "./VibeSearch";
import { pillarIcons, pillarColors, vibeMeta } from "./data";
import "./SpotsView.css";

export default function SpotsView({
  selectedCity,
  todayEvents,
  events,
  searchQuery,
  onSearchChange,
  activeVibes,
  onToggleVibe,
  activePillar,
  onPillarChange,
  filteredSpots,
  allSpots,
  spotsError,
  onSpotClick,
  onGenerateItinerary,
  todaySpotIds,
  countdownTo,
}) {
  const pillars = ["CULTURE", "WELLNESS", "SOCIAL"];

  return (
    <>
      {todayEvents.length > 0 && (
        <div className="today-picks">
          <div className="today-picks-header">
            <span className="today-picks-dot" />
            <span className="today-picks-title">Live Now &mdash; Today&rsquo;s Picks</span>
          </div>
          <div className="today-picks-list">
            {todayEvents.slice(0, 3).map((ev) => (
              <div key={ev._id} className="today-pick-item">
                <span className="today-picks-dot" style={{ width: 6, height: 6 }} />
                <div className="today-pick-col">
                  <span className="today-pick-name">{ev.name}</span>
                  <span className="today-pick-meta">
                    {ev.time} {ev.linkedSpotId?.name ? `@ ${ev.linkedSpotId.name}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="search-bar">
        <span className="search-icon">&#x1F50D;</span>
        <input
          className="search-input"
          type="text"
          placeholder="Search spots..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <VibeFilter activeVibes={activeVibes} onToggleVibe={onToggleVibe} />

      {activeVibes.length > 0 && (
        <p className="vibe-match-msg">
          Showing {filteredSpots.length} spot{filteredSpots.length !== 1 ? "s" : ""} matching your vibe
        </p>
      )}

      <div className="pillar-filters">
        <button
          className={`pillar-filter-btn ${!activePillar ? "active" : ""}`}
          onClick={() => onPillarChange(null)}
        >All</button>
        {pillars.map((p) => (
          <button
            key={p}
            className={`pillar-filter-btn ${activePillar === p ? "active" : ""}`}
            onClick={() => onPillarChange(activePillar === p ? null : p)}
          >
            {pillarIcons[p]} {p.charAt(0) + p.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {(filteredSpots.length > 0 || allSpots.length > 0) && (
        <div className="ai-cta-card" onClick={onGenerateItinerary}>
          <div className="ai-cta-icon">&#x1F9E0;</div>
          <div className="ai-cta-text">
            <div className="ai-cta-title">AI Itinerary</div>
            <div className="ai-cta-desc">Tell me what you&rsquo;re into &mdash; I&rsquo;ll craft a 2-day plan for {selectedCity}.</div>
          </div>
          <button className="btn btn-primary">Generate &rarr;</button>
        </div>
      )}

      {spotsError ? (
        <div className="error-banner">
          <span className="error-icon">!</span>
          <p>{spotsError}</p>
        </div>
      ) : allSpots.length === 0 ? (
        [1, 2, 3].map((i) => (
          <div key={i} className="pillar-section">
            <div className="skeleton skeleton-sm" style={{ width: "30%", marginBottom: 14 }} />
            <div className="spots-list">
              {[1, 2].map((j) => (
                <div key={j} className="skeleton-spot">
                  <div className="skeleton skeleton-md" />
                  <div className="skeleton skeleton-sm" style={{ width: "100%" }} />
                  <div className="skeleton skeleton-sm" style={{ width: "60%" }} />
                </div>
              ))}
            </div>
          </div>
        ))
      ) : filteredSpots.length === 0 ? (
        <p className="empty-state">No spots match your search or vibe.</p>
      ) : pillars.map((pillar) => {
          const pillarSpots = filteredSpots.filter((s) => s.pillar === pillar);
          if (pillarSpots.length === 0) return null;
          return (
            <div key={pillar} className="pillar-section">
              <h3 className="pillar-title">
                <span>{pillarIcons[pillar]}</span>
                {pillar.charAt(0) + pillar.slice(1).toLowerCase()}
              </h3>
              <div className="spots-list">
                {pillarSpots.map((spot) => (
                  <div
                    key={spot._id}
                    className="spot-card"
                    onClick={() => onSpotClick(spot)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && onSpotClick(spot)}
                  >
                    <div className="spot-card-media">
                      <img
                        src={spot.imageUrl || (spot.images && spot.images[0]) || ''}
                        alt={spot.name}
                        className="spot-card-img"
                        onError={e => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList?.remove('hidden') }}
                      />
                      <div
                        className={`spot-card-placeholder ${(spot.imageUrl || (spot.images && spot.images[0])) ? 'hidden' : ''}`}
                        style={{
                          background: `linear-gradient(135deg, ${pillarColors[spot.pillar] || 'var(--copper)'}, ${pillarColors[spot.pillar] || 'var(--copper-hover)'})`
                        }}
                      >
                        <span className="spot-card-placeholder-icon">{pillarIcons[spot.pillar]}</span>
                      </div>
                      <div className="spot-card-overlay" />
                      <h4 className="spot-card-title">{spot.name}</h4>
                      {spot.pillar && (
                        <span className="spot-card-pillar-tag">{pillarIcons[spot.pillar]} {spot.pillar.charAt(0) + spot.pillar.slice(1).toLowerCase()}</span>
                      )}
                      {todaySpotIds.has(spot._id) && <span className="live-badge">Live Tonight</span>}
                    </div>
                    <div className="spot-card-body">
                      <div className="spot-card-meta">
                        {spot.type && <span className="spot-type">{spot.type}</span>}
                        {spot.vibeScore > 0 && (
                          <span className="vibe-score">Match {spot.vibeScore}</span>
                        )}
                      </div>
                      <p className="spot-details">{spot.details}</p>
                      <div className="spot-tags">
                        {spot.vibeTags.map((tag) => {
                          const meta = vibeMeta[tag];
                          return (
                            <span
                              key={tag}
                              className="vibe-tag"
                              style={meta ? { color: meta.color, background: meta.bg } : {}}
                            >
                              {meta?.icon && `${meta.icon} `}{tag}
                            </span>
                          );
                        })}
                      </div>
                      {spot.tip && (
                        <div className="spot-tip">
                          <span className="tip-icon">Tip</span>
                          {spot.tip}
                        </div>
                      )}
                      {events.filter((e) => e.linkedSpotId?._id === spot._id || e.linkedSpotId === spot._id).length > 0 && (
                        <div className="spot-card-events">
                          <div className="spot-card-events-title">Events at this venue</div>
                          {events
                            .filter((e) => e.linkedSpotId?._id === spot._id || e.linkedSpotId === spot._id)
                            .slice(0, 2)
                            .map((ev) => {
                              const d = new Date(ev.date);
                              const cd = countdownTo(ev.date);
                              return (
                                <div key={ev._id} className="spot-card-event-item">
                                  <span className="spot-card-event-date">{d.getDate()}/{d.getMonth() + 1}</span>
                                  <span className="spot-card-event-name">{ev.name}</span>
                                  {cd && <span className="countdown">{cd}</span>}
                                </div>
                              );
                            })}
                          {events.filter((e) => e.linkedSpotId?._id === spot._id).length > 2 && (
                            <div className="spot-card-event-more">
                              +{events.filter((e) => e.linkedSpotId?._id === spot._id).length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </>
  );
}
