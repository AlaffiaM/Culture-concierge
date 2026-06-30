import { useState, useRef, useEffect } from 'react'
import { adminFetch } from './adminApi'
import AdminVenueScraper from './AdminVenueScraper'

const SOURCES = ['ticketsasa', 'kenyabuzz', 'mookh', 'eventbrite']

const SOURCE_LABELS = {
  ticketsasa: 'Ticketsasa',
  kenyabuzz: 'KenyaBuzz',
  mookh: 'Mookh',
  eventbrite: 'Eventbrite',
}

const SOURCE_NOTES = {
  kenyabuzz: 'Requires Puppeteer — Angular SPA',
  mookh: 'Requires Puppeteer — Next.js SPA',
}

export default function AdminScraper() {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [accepting, setAccepting] = useState(false)
  const [history, setHistory] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [venueExpanded, setVenueExpanded] = useState(new Set())
  const [existingEvents, setExistingEvents] = useState(null)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [refreshingAdvisories, setRefreshingAdvisories] = useState(false)
  const [advisoryResult, setAdvisoryResult] = useState(null)

  async function handleRun(source) {
    setRunning(true)
    setResults(null)
    setSelectedIds(new Set())
    setExistingEvents(null)
    try {
      const body = source ? { source } : {}
      const res = await adminFetch('/api/scraper/run', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setResults(res)
      if (res.events?.length === 0) loadExistingScraped()
    } catch (err) {
      console.error('[AdminScraper] Run failed:', err.message)
    } finally {
      setRunning(false)
    }
  }

  async function loadExistingScraped() {
    setLoadingExisting(true)
    try {
      const data = await adminFetch('/api/events/scraped')
      setExistingEvents(data)
      setSelectedIds(new Set())
    } catch (err) {
      console.error('[AdminScraper] Load existing failed:', err.message)
    } finally {
      setLoadingExisting(false)
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll(items) {
    if (!items?.length) return
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(e => e._id)))
    }
  }

  function handleAccept(idsOverride) {
    const ids = idsOverride || Array.from(selectedIds)
    if (ids.length === 0) return
    setAccepting(true)
    adminFetch('/api/scraper/accept', {
      method: 'POST',
      body: JSON.stringify({ eventIds: ids }),
    })
      .then(() => {
        const updateList = list =>
          list.map(e => (ids.includes(e._id) ? { ...e, status: 'draft' } : e))
        if (results?.events) {
          setResults(prev => ({ ...prev, events: updateList(prev.events) }))
        }
        if (existingEvents) {
          setExistingEvents(prev => updateList(prev))
        }
        setSelectedIds(new Set())
      })
      .catch(err => console.error('[AdminScraper] Accept failed:', err.message))
      .finally(() => setAccepting(false))
  }

  async function loadHistory() {
    try {
      const data = await adminFetch('/api/scraper/history?limit=20')
      setHistory(data)
      setShowHistory(true)
    } catch (err) {
      console.error('[AdminScraper] History failed:', err.message)
    }
  }

  async function handleRefreshAdvisories() {
    setRefreshingAdvisories(true)
    setAdvisoryResult(null)
    try {
      const res = await adminFetch('/api/advisories/refresh', {
        method: 'POST',
      })
      setAdvisoryResult(res)
    } catch (err) {
      setAdvisoryResult({ error: err.message })
    } finally {
      setRefreshingAdvisories(false)
    }
  }

  function formatDate(d) {
    if (!d) return '—'
    const date = new Date(d)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function renderTable(items, title) {
    const pendingCount = items.filter(e => e.status === 'scraped').length
    return (
      <div style={{ marginBottom: 28 }}>
        <div className="admin-toolbar" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text)' }}>
            {title} ({items.length})
            {pendingCount > 0 && ` (${pendingCount} pending)`}
          </span>
          {pendingCount > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="admin-btn-sm admin-btn-approve" onClick={() => selectAll(items)}>
                {selectedIds.size === items.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={() => handleAccept()}
                disabled={selectedIds.size === 0 || accepting}
                style={{ padding: '4px 14px', fontSize: 12 }}
              >
                {accepting ? 'Accepting...' : `Accept to Draft (${selectedIds.size})`}
              </button>
            </div>
          )}
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th style={{ width: 50 }}>Image</th>
                <th>Name</th>
                <th>Venue</th>
                <th>Price</th>
                <th>City</th>
                <th>Date</th>
                <th>Pillar</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(ev => {
                const canAccept = ev.status === 'scraped'
                return (
                  <tr key={ev._id}>
                    <td>
                      {canAccept && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(ev._id)}
                          onChange={() => toggleSelect(ev._id)}
                          style={{ accentColor: '#B45F2D' }}
                        />
                      )}
                    </td>
                    <td>
                      {ev.imageUrl ? (
                        <a href={ev.imageUrl} target="_blank" rel="noopener noreferrer">
                          <img src={ev.imageUrl} alt="" className="admin-thumb" />
                        </a>
                      ) : (
                        <div className="admin-thumb" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{ev.name}</td>
                    <td
                      style={{ color: 'var(--admin-text-muted)', fontSize: 12, cursor: ev.venue ? 'pointer' : 'default', maxWidth: 160 }}
                      onClick={() => {
                        if (!ev.venue) return
                        setVenueExpanded(prev => {
                          const next = new Set(prev)
                          next.has(ev._id) ? next.delete(ev._id) : next.add(ev._id)
                          return next
                        })
                      }}
                      title={venueExpanded.has(ev._id) ? '' : ev.venue}
                    >
                      {venueExpanded.has(ev._id) ? ev.venue : (ev.venue || '—')}
                    </td>
                    <td style={{ fontSize: 12 }}>{ev.price || '—'}</td>
                    <td>{ev.city}</td>
                    <td>{formatDate(ev.date)}</td>
                    <td>
                      <span className="admin-status-badge admin-status-draft">
                        {ev.pillar || '—'}
                      </span>
                    </td>
                    <td>
                      {canAccept ? (
                        <button
                          className="admin-btn-sm admin-btn-approve"
                          onClick={() => handleAccept([ev._id])}
                          disabled={accepting}
                        >
                          Accept
                        </button>
                      ) : (
                        <span className={`admin-status-badge ${ev.status === 'draft' ? 'admin-status-draft' : 'admin-status-approved'}`}>
                          {ev.status}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="admin-quick-actions">
          <button
            className={`admin-quick-action${running ? ' loading' : ''}`}
            onClick={() => handleRun(null)}
            disabled={running}
          >
            <div className="admin-quick-action-icon copper">
              {running ? <div className="admin-spinner" /> : '⚡'}
            </div>
            <div className="admin-quick-action-body">
              <h4>{running ? 'Running...' : 'Run All Scrapers'}</h4>
              <p>Import events from all sources</p>
            </div>
          </button>

          {SOURCES.map(src => {
            const disabled = running || !!SOURCE_NOTES[src]
            return (
              <button
                key={src}
                className={`admin-quick-action${running ? ' loading' : ''}`}
                onClick={() => handleRun(src)}
                disabled={disabled}
                title={SOURCE_NOTES[src] || `Import from ${SOURCE_LABELS[src]}`}
                style={{ opacity: disabled ? 0.35 : 1 }}
              >
                <div className="admin-quick-action-icon sage">
                  {running ? <div className="admin-spinner" /> : SOURCE_NOTES[src] ? '⏸' : '→'}
                </div>
                <div className="admin-quick-action-body">
                  <h4>{SOURCE_LABELS[src]}</h4>
                  <p>{SOURCE_NOTES[src] || `Import from ${SOURCE_LABELS[src]}`}</p>
                </div>
              </button>
            )
          })}
        </div>

        <button
          className="admin-btn admin-btn-secondary"
          onClick={loadHistory}
          style={{ marginTop: 4 }}
        >
          {showHistory ? 'Refresh' : 'View Recent Imports'}
        </button>
      </div>

      {results && (
        <div>
          <div className="admin-stats-grid" style={{ marginBottom: 16 }}>
            {SOURCES.map(src => {
              const r = results.results?.[src]
              if (!r) return null
              return (
                <div key={src} className="admin-stat-card">
                  <div className="admin-stat-header">
                    <div className={`admin-stat-icon ${r.error ? 'white' : 'copper'}`}>
                      {r.error ? '⚠️' : '✓'}
                    </div>
                  </div>
                  <div className="admin-stat-number">{r.new || 0}</div>
                  <div className="admin-stat-label">
                    {SOURCE_LABELS[src]} — {r.fetched || 0} found, {r.skipped || 0} skipped
                    {r.error && <span style={{ display: 'block', fontSize: 10, color: '#e55555' }}>{r.error}</span>}
                    {SOURCE_NOTES[src] && <span style={{ display: 'block', fontSize: 10, color: '#888' }}>{SOURCE_NOTES[src]}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {results.events?.length > 0 && renderTable(results.events, 'Newly imported events')}

          {results.events?.length === 0 && !existingEvents && (
            <div className="admin-stat-card" style={{ textAlign: 'center', padding: 32 }}>
              <p style={{ color: 'var(--admin-text-muted)', margin: '0 0 12px 0' }}>
                No new events found — all already in the database.
              </p>
              <button className="admin-btn admin-btn-secondary" onClick={loadExistingScraped} disabled={loadingExisting}>
                {loadingExisting ? 'Loading...' : 'Browse existing scraped events'}
              </button>
            </div>
          )}
        </div>
      )}

      {existingEvents && existingEvents.length > 0 && renderTable(existingEvents, 'Existing scraped events')}

      {existingEvents && existingEvents.length === 0 && (
        <div className="admin-stat-card" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: 'var(--admin-text-muted)', margin: 0 }}>
            No scraped events in the database.
          </p>
        </div>
      )}

      <div style={{ marginTop: 40, marginBottom: 12 }}>
        <h3 className="admin-section-title">Venue Scraper</h3>
      </div>
      <AdminVenueScraper />

      <div style={{ marginTop: 40, marginBottom: 12 }}>
        <h3 className="admin-section-title">Travel Brief (Advisories)</h3>
      </div>
      <div className="admin-quick-actions">
        <button
          className={`admin-quick-action${refreshingAdvisories ? ' loading' : ''}`}
          onClick={handleRefreshAdvisories}
          disabled={refreshingAdvisories}
        >
          <div className="admin-quick-action-icon copper">
            {refreshingAdvisories ? <div className="admin-spinner" /> : '🌍'}
          </div>
          <div className="admin-quick-action-body">
            <h4>{refreshingAdvisories ? 'Refreshing...' : 'Refresh All Advisories'}</h4>
            <p>Generate security &amp; health advisories via Gemini for all cities</p>
          </div>
        </button>
      </div>
      {advisoryResult && (
        <div style={{ padding: '10px 14px', marginBottom: 16, borderRadius: 8, fontSize: 13, background: advisoryResult.error ? 'rgba(220,50,50,0.1)' : 'rgba(80,180,80,0.1)', color: advisoryResult.error ? '#dc3232' : '#2e7d32' }}>
          {advisoryResult.error
            ? `Error: ${advisoryResult.error}`
            : `Updated ${advisoryResult.updated || 0} city advisory(ies).`}
        </div>
      )}

      {showHistory && history && (
        <div>
          <div className="admin-section-header">
            <h3 className="admin-section-title">Recent Imports</h3>
            <button
              className="admin-btn-sm admin-btn-edit"
              onClick={() => setShowHistory(false)}
            >
              Hide
            </button>
          </div>

          {history.length === 0 ? (
            <p className="admin-empty">No scraped events yet.</p>
          ) : (
            <div className="admin-activity-feed">
              {history.map(ev => (
                <div key={ev._id} className="admin-activity-item">
                  <div className={`admin-activity-dot ${ev.status === 'approved' ? 'sage' : 'copper'}`} />
                  <span style={{ fontWeight: 500 }}>{ev.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                    {SOURCE_LABELS[ev.source] || ev.source}
                  </span>
                  <span>{formatDate(ev.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
