import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

export default function AdminSettings({ user }) {
  const [outscraperStatus, setOutscraperStatus] = useState(null)
  const [keyInput, setKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  useEffect(() => {
    adminFetch('/api/admin/outscraper-status')
      .then(setOutscraperStatus)
      .catch(() => setOutscraperStatus({ configured: false }))
  }, [])

  async function handleSaveKey() {
    if (!keyInput.trim()) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const result = await adminFetch('/api/admin/outscraper-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey: keyInput.trim() }),
      })
      setOutscraperStatus({ configured: true, keyPreview: result.keyPreview })
      setKeyInput('')
      setSaveMsg('Key saved successfully')
    } catch (err) {
      setSaveMsg('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

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

      <div className="admin-stat-card" style={{ maxWidth: 480, marginBottom: 16 }}>
        <div className="admin-stat-header">
          <div className="admin-stat-icon white">📷</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          Outscraper API (Google Maps Photos)
        </div>
        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginBottom: 8 }}>
          {outscraperStatus === null
            ? 'Checking...'
            : outscraperStatus.configured
              ? 'Key: ' + outscraperStatus.keyPreview
              : 'Not configured — set your key below'}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="text"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="Paste your Outscraper API key"
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13,
            }}
          />
          <button className="admin-btn-sm" onClick={handleSaveKey} disabled={saving || !keyInput.trim()}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        {saveMsg && (
          <div style={{ fontSize: 11, marginTop: 6, color: saveMsg.startsWith('Error') ? '#dc3232' : '#2e7d32' }}>
            {saveMsg}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 8 }}>
          Get a free API key at{' '}
          <a href="https://outscraper.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--admin-copper)' }}>
            outscraper.com
          </a>
          . The free tier covers 500 places. Your key is stored on the server and never exposed to visitors.
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
