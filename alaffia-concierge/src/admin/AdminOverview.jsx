import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

const STAT_ICONS = {
  totalEvents: { icon: '📅', color: 'white', nav: 'events' },
  totalSpots: { icon: '📍', color: 'copper', nav: 'spots' },
  ghostEvents: { icon: '📝', color: 'white', nav: 'ghosts' },
  eventsThisWeek: { icon: '🔥', color: 'copper', nav: 'events' },
}

const PILLAR_STYLES = {
  WELLNESS: { bg: 'rgba(138,154,91,0.15)', text: '#8A9A5B', label: 'Wellness' },
  CULTURE: { bg: 'rgba(180,95,45,0.15)', text: '#B45F2D', label: 'Culture' },
  SOCIAL: { bg: 'rgba(91,138,154,0.15)', text: '#5B8A9A', label: 'Social' },
}

const CITY_COLORS = ['#B45F2D', '#8A9A5B', '#5B8A9A', '#9A5B8A', '#B48A5B', '#5B9A8A']

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminOverview({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [recentEvents, setRecentEvents] = useState([])
  useEffect(() => {
    adminFetch('/api/admin/stats')
      .then(setStats)
      .catch(err => console.error('[AdminOverview] Stats:', err.message))

    adminFetch('/api/events?limit=20')
      .then(data => setRecentEvents(data.events || []))
      .catch(() => {})
  }, [])

  if (!stats) return <p className="admin-empty">Loading dashboard...</p>

  const statEntries = [
    { key: 'totalEvents', label: 'Total Events' },
    { key: 'totalSpots', label: 'Total Spots' },
    { key: 'ghostEvents', label: 'Draft Events', tooltip: 'Pop-up and draft events awaiting approval' },
    { key: 'eventsThisWeek', label: 'Events This Week' },
  ]

  const maxCity = stats.eventsByCity?.length
    ? stats.eventsByCity.reduce((a, b) => (a.count > b.count ? a : b))
    : null

  const allCities = []
  const seen = new Set()
  for (const c of [...(stats.eventsByCity || []), ...(stats.spotsByCity || [])]) {
    if (!seen.has(c.city)) {
      allCities.push(c)
      seen.add(c.city)
    }
  }

  return (
    <div>
      <div className="admin-stats-grid">
        {statEntries.map(({ key, label }) => {
          const meta = STAT_ICONS[key]
          return (
            <div key={key} className="admin-stat-card">
              <div className="admin-stat-header">
                <div className={`admin-stat-icon ${meta?.color || 'white'}`}>
                  {meta?.icon || '•'}
                </div>
              </div>
              <div className="admin-stat-number">{stats[key] ?? 0}</div>
              <div className="admin-stat-label">{label}</div>
            </div>
          )
        })}
      </div>

      {stats.draftEvents > 0 && (
        <div className="admin-quick-actions">
          <button className="admin-quick-action" onClick={() => onNavigate('events')}>
            <div className="admin-quick-action-icon copper">⏳</div>
            <div className="admin-quick-action-body">
              <h4>{stats.draftEvents} event{stats.draftEvents !== 1 ? 's' : ''} pending review</h4>
              <p>Click to review and approve</p>
            </div>
          </button>
          <button className="admin-quick-action" onClick={() => onNavigate('spots')}>
            <div className="admin-quick-action-icon sage">📍</div>
            <div className="admin-quick-action-body">
              <h4>{stats.totalSpots} spots across {stats.spotsByCity?.length || 0} cities</h4>
              <p>Manage your venues and experiences</p>
            </div>
          </button>
        </div>
      )}

      {stats.eventsByCity?.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="admin-section-header">
            <h3 className="admin-section-title">Events by City</h3>
          </div>
          <div className="admin-city-list">
            {stats.eventsByCity.map(c => (
              <div key={c.city} className="admin-city-row">
                <span>{c.city}</span>
                <span>{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.spotsByCity?.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="admin-section-header">
            <h3 className="admin-section-title">Spots by City</h3>
          </div>
          <div className="admin-city-list">
            {stats.spotsByCity.map(c => (
              <div key={c.city} className="admin-city-row">
                <span>{c.city}</span>
                <span>{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentEvents.length > 0 && (
        <div>
          <div className="admin-section-header">
            <h3 className="admin-section-title">Recent Events</h3>
          </div>
          <div className="admin-activity-feed">
            {recentEvents.map(ev => (
              <div key={ev._id} className="admin-activity-item">
                <div className={`admin-activity-dot ${ev.status === 'approved' ? 'sage' : 'copper'}`} />
                <span style={{ fontWeight: 500 }}>{ev.name}</span>
                <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{ev.city}</span>
                <span>{formatDate(ev.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
