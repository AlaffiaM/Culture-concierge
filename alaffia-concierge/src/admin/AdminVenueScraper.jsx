import { useState } from 'react'
import { adminFetch } from './adminApi'

const SOURCE_LABELS = {
  gemini: 'AI Research',
}

export default function AdminVenueScraper() {
  const [scraperRunning, setScraperRunning] = useState(null)
  const [scraperResults, setScraperResults] = useState(null)
  const [scraperSelected, setScraperSelected] = useState(new Set())
  const [accepting, setAccepting] = useState(false)
  const [venueExpanded, setVenueExpanded] = useState(new Set())
  const [existingSpots, setExistingSpots] = useState(null)
  const [loadingExisting, setLoadingExisting] = useState(false)

  async function handleRunScraper(source) {
    setScraperRunning(source)
    setScraperResults(null)
    setScraperSelected(new Set())
    setExistingSpots(null)
    try {
      const res = await adminFetch('/api/spots/scraper/run', {
        method: 'POST',
        body: JSON.stringify({ source }),
      })
      setScraperResults(res)
      if (res.spots.length === 0) loadExistingScraped()
    } catch (err) {
      console.error('[AdminVenueScraper] Run failed:', err.message)
    } finally {
      setScraperRunning(null)
    }
  }

  async function loadExistingScraped() {
    setLoadingExisting(true)
    try {
      const all = await adminFetch('/api/spots?all=true')
      setExistingSpots(all.filter(s => ['gemini'].includes(s.source) && s.status === 'scraped'))
      setScraperSelected(new Set())
    } catch (err) {
      console.error('[AdminVenueScraper] Load existing failed:', err.message)
    } finally {
      setLoadingExisting(false)
    }
  }

  function toggleScraperSelect(id) {
    setScraperSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAllScraper(items) {
    if (!items?.length) return
    if (scraperSelected.size === items.length) {
      setScraperSelected(new Set())
    } else {
      setScraperSelected(new Set(items.map(s => s._id)))
    }
  }

  async function handleAccept(idsOverride) {
    const ids = idsOverride || Array.from(scraperSelected)
    if (ids.length === 0) return
    setAccepting(true)
    try {
      await adminFetch('/api/spots/scraper/accept', {
        method: 'POST',
        body: JSON.stringify({ spotIds: ids }),
      })
      const updateList = list =>
        list.map(s => (ids.includes(s._id) ? { ...s, status: 'inactive' } : s))
      if (scraperResults?.spots) {
        setScraperResults(prev => ({ ...prev, spots: updateList(prev.spots) }))
      }
      if (existingSpots) {
        setExistingSpots(prev => updateList(prev))
      }
      setScraperSelected(new Set())
    } catch (err) {
      console.error('[AdminVenueScraper] Accept failed:', err.message)
    } finally {
      setAccepting(false)
    }
  }

  function renderTable(items, title) {
    return (
      <div>
        <div className="admin-toolbar" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text)' }}>
            {title} ({items.length})
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="admin-btn-sm admin-btn-edit" onClick={() => selectAllScraper(items)}>
              {scraperSelected.size === items.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => handleAccept()}
              disabled={scraperSelected.size === 0 || accepting}
              style={{ padding: '4px 14px', fontSize: 12 }}
            >
              {accepting ? 'Accepting...' : `Accept (${scraperSelected.size})`}
            </button>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th style={{ width: 180 }}>Images</th>
                <th>Venue</th>
                <th>Address</th>
                <th>City</th>
                <th>Tags</th>
                <th>Source</th>
                <th style={{ width: 80 }}>Accept</th>
              </tr>
            </thead>
            <tbody>
              {items.map(spot => {
                const canAccept = spot.status === 'scraped'
                return (
                  <tr key={spot._id}>
                    <td>
                      {canAccept && (
                        <input
                          type="checkbox"
                          checked={scraperSelected.has(spot._id)}
                          onChange={() => toggleScraperSelect(spot._id)}
                          style={{ accentColor: '#B45F2D' }}
                        />
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {spot.images?.slice(0, 5).map((img, i) => (
                          <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                            <img
                              src={img}
                              alt=""
                              style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                              onError={e => { e.target.style.display = 'none' }}
                            />
                          </a>
                        ))}
                        {(!spot.images || spot.images.length === 0) && (
                          <div style={{ width: 50, height: 50, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
                        )}
                        {spot.images?.length > 5 && (
                          <span style={{ fontSize: 10, color: 'var(--admin-text-muted)', alignSelf: 'flex-end' }}>
                            +{spot.images.length - 5}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{spot.name}</td>
                    <td
                      style={{ color: 'var(--admin-text-muted)', fontSize: 11, cursor: spot.address ? 'pointer' : 'default', maxWidth: 160 }}
                      onClick={() => {
                        if (!spot.address) return
                        setVenueExpanded(prev => {
                          const next = new Set(prev)
                          next.has(spot._id) ? next.delete(spot._id) : next.add(spot._id)
                          return next
                        })
                      }}
                      title={venueExpanded.has(spot._id) ? '' : spot.address}
                    >
                      {venueExpanded.has(spot._id) ? spot.address : (spot.address?.slice(0, 30) || '—')}
                    </td>
                    <td>{spot.city}</td>
                    <td style={{ fontSize: 11 }}>
                      {(spot.tags || []).slice(0, 3).join(', ')}
                      {spot.tags?.length > 3 && '...'}
                    </td>
                    <td>
                      <span className="admin-status-badge" style={{ background: 'rgba(180,95,45,0.15)', color: '#B45F2D' }}>
                        {SOURCE_LABELS[spot.source] || spot.source}
                      </span>
                    </td>
                    <td>
                      {canAccept ? (
                        <button
                          className="admin-btn-sm admin-btn-approve"
                          onClick={() => {
                            setScraperSelected(new Set([spot._id]))
                            handleAccept([spot._id])
                          }}
                          disabled={accepting}
                        >
                          Accept
                        </button>
                      ) : (
                        <span className="admin-status-badge admin-status-inactive">Accepted</span>
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
      <div className="admin-quick-actions" style={{ marginBottom: 12 }}>
        <button
          className={`admin-quick-action${scraperRunning === 'gemini' ? ' loading' : ''}`}
          onClick={() => handleRunScraper('gemini')}
          disabled={scraperRunning !== null}
        >
          <div className="admin-quick-action-icon sage">
            {scraperRunning === 'gemini' ? <div className="admin-spinner" /> : '🤖'}
          </div>
          <div className="admin-quick-action-body">
            <h4>{scraperRunning === 'gemini' ? 'Researching...' : 'AI Research Spots'}</h4>
            <p>Gemini searches Google for cultural + wellness venues</p>
          </div>
        </button>
      </div>

      {scraperResults && scraperResults.spots?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {renderTable(scraperResults.spots, `New: ${scraperResults.source} — ${scraperResults.fetched} found, ${scraperResults.new} new (${scraperResults.skipped} skipped)`)}
        </div>
      )}

      {scraperResults && scraperResults.spots?.length === 0 && !existingSpots && (
        <div className="admin-stat-card" style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ color: 'var(--admin-text-muted)', margin: '0 0 12px 0' }}>
            No new venues found — all already in the database.
          </p>
          <button className="admin-btn admin-btn-secondary" onClick={loadExistingScraped} disabled={loadingExisting}>
            {loadingExisting ? 'Loading...' : 'Browse existing scraped venues'}
          </button>
        </div>
      )}

      {existingSpots && existingSpots.length > 0 && (
        <div>
          {renderTable(existingSpots, 'Existing scraped venues')}
        </div>
      )}

      {existingSpots && existingSpots.length === 0 && (
        <div className="admin-stat-card" style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ color: 'var(--admin-text-muted)', margin: 0 }}>
            No scraped venues in the database.
          </p>
        </div>
      )}
    </div>
  )
}
