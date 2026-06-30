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
  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 12,
        marginBottom: 32,
      }}>
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon white">👤</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            {user?.displayName || 'Admin'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
            {user?.email || 'Unknown'}
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon sage">🔑</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            Admin
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
            Full access to all content
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon white">🔗</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            API
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
            {import.meta.env.VITE_API_URL || '(dev proxy)'}
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
