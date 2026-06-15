import { useState, useEffect } from 'react'
import { pillarIcons, pillarColors, vibeMeta } from './data'
import './SpotDetailModal.css'

function SpotDetailModal({ spot, events, onClose }) {
  const [visible, setVisible] = useState(false)
  const [heroIdx, setHeroIdx] = useState(0)

  const allImages = (spot.images || []).length > 0 ? spot.images : (spot.imageUrl ? [spot.imageUrl] : [])
  const heroImage = allImages[heroIdx]

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  const spotEvents = (events || []).filter(
    (e) => e.linkedSpotId && (e.linkedSpotId._id === spot._id || e.linkedSpotId === spot._id)
  )
  const icon = pillarIcons[spot.pillar] || '✦'
  const color = pillarColors[spot.pillar] || 'var(--copper)'

  return (
    <div className={`modal-overlay ${visible ? 'visible' : ''}`} onClick={handleClose}>
      <div
        className={`modal-content ${visible ? 'visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={spot.name}
      >
        <div className="drag-handle" />
        <button className="modal-close" onClick={handleClose} aria-label="Close">
          &times;
        </button>

        <div className="modal-media">
          {heroImage ? (
            <img src={heroImage} alt={spot.name} className="modal-img" />
          ) : (
            <div className="modal-placeholder" style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
              <span className="modal-placeholder-icon">{icon}</span>
            </div>
          )}
          {allImages.length > 1 && (
            <div className="modal-thumb-strip">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  className={`modal-thumb-btn ${i === heroIdx ? 'active' : ''}`}
                  onClick={() => setHeroIdx(i)}
                >
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          )}
          <div className="modal-media-overlay" />
          <h2 className="modal-title-overlay">{spot.name}</h2>
          <span className="modal-pillar-tag">{icon} {spot.pillar?.charAt(0) + spot.pillar?.slice(1).toLowerCase()}</span>
        </div>
        <div className="modal-body">
          {spot.type && <span className="modal-type">{spot.type}</span>}

          {spot.address && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              📍 {spot.address}
            </p>
          )}

          {(spot.description || spot.details) && <p className="modal-details">{spot.description || spot.details}</p>}

          {(spot.tags || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
              {spot.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 10, background: 'rgba(255,255,255,0.06)', padding: '2px 8px',
                  borderRadius: 10, color: 'var(--text-muted)',
                }}>{tag}</span>
              ))}
            </div>
          )}

          {spot.vibeTags && spot.vibeTags.length > 0 && (
            <div className="modal-tags">
              {spot.vibeTags.map((tag) => {
                const meta = vibeMeta[tag];
                return (
                  <span key={tag} className="vibe-tag" style={meta ? { color: meta.color, background: meta.bg } : {}}>
                    {meta?.icon && `${meta.icon} `}{tag}
                  </span>
                );
              })}
            </div>
          )}

          {spot.tip && (
            <div className="spot-tip">
              <span className="tip-icon">Tip</span>
              {spot.tip}
            </div>
          )}

          {spotEvents.length > 0 && (
            <div className="modal-events">
              <h3 className="modal-events-title">
                {spotEvents.length === 1 ? '1 event here' : `${spotEvents.length} events here`}
              </h3>
              {spotEvents.map((event) => {
                const d = new Date(event.date)
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                return (
                  <div key={event._id} className="modal-event-row">
                    <div className="modal-event-date">
                      <span className="modal-event-day">{dayNames[d.getDay()]}</span>
                      <span className="modal-event-num">{d.getDate()}</span>
                      <span className="modal-event-month">{monthNames[d.getMonth()]}</span>
                    </div>
                    <div className="modal-event-info">
                      <div className="modal-event-name">{event.name}</div>
                      {event.time && <div className="modal-event-time">{event.time}</div>}
                    </div>
                    {event.vibe && (
                      <span
                        className={`event-vibe vibe-${event.vibe.toLowerCase()}`}
                        style={(() => { const m = vibeMeta[event.vibe]; return m ? { color: m.color, background: m.bg } : {} })()}
                      >
                        {event.vibe}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SpotDetailModal
