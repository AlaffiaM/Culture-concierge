import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

const ALL_CITIES = ['Lagos', 'Abuja', 'Kigali', 'Nairobi']

const PRESET_VIBES = [
  '#SocialCreative', '#QuietIntellectual', '#ActiveWellness', '#HighCulture',
  '#PremiumLuxury', '#NatureEscape', '#WellnessRetreat', '#Nightlife',
  '#Underground', '#StreetCulture', '#Foodie', '#Workshop', '#HiddenGem',
]

const API_BASE = import.meta.env.VITE_API_URL || '(local proxy)'

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminSettings({ user }) {
  const [health, setHealth] = useState(null)
  const [team, setTeam] = useState([])
  const [vibeTags, setVibeTags] = useState([])
  const [newVibe, setNewVibe] = useState('')
  const [activeCities, setActiveCities] = useState(ALL_CITIES)
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [clearResult, setClearResult] = useState(null)
  const [confirmDanger, setConfirmDanger] = useState('')

  useEffect(() => {
    Promise.all([
      adminFetch('/api/admin/health'),
      adminFetch('/api/admin/team'),
      adminFetch('/api/admin/vibe-tags'),
    ]).then(([h, t, v]) => {
      setHealth(h)
      setTeam(t)
      setVibeTags(v)
    }).catch(err => console.error('[AdminSettings]', err.message))
      .finally(() => setLoading(false))
  }, [])

  function toggleCity(city) {
    setActiveCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
  }

  function addVibeTag() {
    const tag = newVibe.trim()
    if (!tag || vibeTags.includes(tag)) return
    setVibeTags(prev => [...prev, tag].sort())
    setNewVibe('')
  }

  function removeVibeTag(tag) {
    setVibeTags(prev => prev.filter(t => t !== tag))
  }

  async function handleExport(type) {
    try {
      const token = await user?.getIdToken()
      const res = await fetch(`${API_BASE}/api/admin/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-export.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Export failed: ${err.message}`)
    }
  }

  async function handleClearScraped() {
    if (confirmDanger !== 'CLEAR') return
    setClearing(true)
    setClearResult(null)
    try {
      const res = await adminFetch('/api/admin/scraped-events', { method: 'DELETE' })
      setClearResult({ ok: true, deleted: res.deleted })
      setConfirmDanger('')
    } catch (err) {
      setClearResult({ ok: false, message: err.message })
    } finally {
      setClearing(false)
    }
  }

  const HEALTHY_COLOR = '#8A9A5B'
  const WARN_COLOR = '#f0b429'
  const BAD_COLOR = '#dc3232'
  const IDLE_COLOR = '#666'

  function envVal(key) {
    return import.meta.env[key] || 'Not set'
  }

  return (
    <div className="settings-page">
      {/* Admin Profile */}
      <div className="settings-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon white">👤</div>
            <div>
              <div className="admin-stat-number" style={{ fontSize: 18 }}>{user?.displayName || 'Admin'}</div>
              <div className="admin-stat-label">{user?.email || 'Unknown'}</div>
            </div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon sage">🔑</div>
            <div>
              <div className="admin-stat-number" style={{ fontSize: 18 }}>Admin</div>
              <div className="admin-stat-label">Full access to all content</div>
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="settings-section">
        <h3 className="admin-section-title">System Health</h3>
        <div className="settings-grid">
          <div className="health-card">
            <div className="health-card-row">
              <span className="health-label">Database</span>
              <span className="health-value" style={{ color: health?.database === 'connected' ? HEALTHY_COLOR : health?.database === 'connecting' ? WARN_COLOR : BAD_COLOR }}>
                {health?.database === 'connected' ? '● Connected' : health?.database === 'connecting' ? '● Connecting' : '○ Disconnected'}
              </span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Last Scraper Run</span>
              <span className="health-value">{formatDate(health?.lastScraperRun)}</span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Gemini API</span>
              <span className="health-value" style={{ color: health?.geminiKeyConfigured ? HEALTHY_COLOR : BAD_COLOR }}>
                {health?.geminiKeyConfigured ? '● Configured' : '○ Not configured'}
              </span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Server Uptime</span>
              <span className="health-value">{health ? formatUptime(health.uptime) : '—'}</span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Total Events</span>
              <span className="health-value">{health?.eventCount ?? '—'}</span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Total Spots</span>
              <span className="health-value">{health?.spotCount ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="settings-section">
        <h3 className="admin-section-title">API Configuration</h3>
        <div className="settings-grid">
          <div className="health-card">
            <div className="health-card-row">
              <span className="health-label">API Endpoint</span>
              <span className="health-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{API_BASE}</span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Firebase</span>
              <span className="health-value" style={{ color: HEALTHY_COLOR }}>
                ● Configured
              </span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Node Version</span>
              <span className="health-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{health?.nodeVersion || '—'}</span>
            </div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon white">🔥</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            Firebase
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
            alaffia-concierge
          </div>
        </div>
      </div>

      <p style={{
        fontSize: 12,
        color: 'var(--admin-text-muted)',
        lineHeight: 1.6,
        maxWidth: 480,
      }}>
        Admin email management is configured via the <code style={{ color: 'var(--admin-copper)', background: 'rgba(180,95,45,0.1)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>ADMIN_EMAILS</code> environment variable on the backend. Contact a developer to add or remove admin users.
      </p>
    </div>
  )
}
