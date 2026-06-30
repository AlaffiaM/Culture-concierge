import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'
import SpotEditor from './SpotEditor'

const CITIES = ['All', 'Lagos', 'Abuja', 'Kigali', 'Nairobi']
const PILLARS = ['All', 'CULTURE', 'WELLNESS', 'SOCIAL']
const PAGE_SIZE = 20

const SCRAPER_SOURCES = ['gemini', 'ticketsasa', 'kenyabuzz', 'mookh', 'eventbrite']

function sourceStyle(source) {
  if (!source) return { bg: 'rgba(255,255,255,0.06)', color: '#666', label: '—' }
  const s = source.toLowerCase()
  if (s === 'manual' || s === 'curated') {
    return { bg: 'rgba(91,107,138,0.15)', color: '#6B7F9E', label: source.toUpperCase() }
  }
  if (SCRAPER_SOURCES.includes(s)) {
    return { bg: 'rgba(138,154,91,0.15)', color: '#8A9A5B', label: source.toUpperCase() }
  }
  return { bg: 'rgba(255,255,255,0.06)', color: '#888', label: source.toUpperCase() }
}

function timeAgo(date) {
  if (!date) return '—'
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminSpots() {
  const [spots, setSpots] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterCity, setFilterCity] = useState('All')
  const [filterPillar, setFilterPillar] = useState('All')
  const [search, setSearch] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editingSpot, setEditingSpot] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [findLoading, setFindLoading] = useState(false)
  const [findResult, setFindResult] = useState(null)

  function loadSpots() {
    const params = new URLSearchParams({ all: 'true', page, limit: PAGE_SIZE })
    if (filterCity !== 'All') params.set('city', filterCity)

    adminFetch(`/api/spots?${params}`)
      .then(data => {
        let filtered = data
        if (filterCity !== 'All') {
          filtered = filtered.filter(s => s.city?.toLowerCase() === filterCity.toLowerCase())
        }
        if (filterPillar !== 'All') {
          filtered = filtered.filter(s => s.pillar === filterPillar)
        }
        setSpots(filtered)
      })
      .catch(err => console.error('[AdminSpots]', err.message))
  }

  useEffect(() => { loadSpots() }, [filterCity, filterPillar])

  function selectAll() {
    if (selectedIds.size === spots.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(spots.map(s => s._id)))
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function bulkToggleStatus(setActive) {
    if (!confirm(`${setActive ? 'Activate' : 'Deactivate'} ${selectedIds.size} spot(s)?`)) return
    for (const id of selectedIds) {
      await adminFetch(`/api/spots/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: setActive ? 'active' : 'inactive' }),
      }).catch(() => {})
    }
    setSelectedIds(new Set())
    loadSpots()
  }

  async function handleToggleStatus(spot) {
    const newStatus = spot.status === 'scraped' ? 'active' : spot.status === 'active' ? 'inactive' : 'active'
    await adminFetch(`/api/spots/${spot._id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    })
    loadSpots()
  }

  async function handleApproveSpot(id) {
    await adminFetch(`/api/spots/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'active' }),
    })
    loadSpots()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this spot?')) return
    await adminFetch(`/api/spots/${id}`, { method: 'DELETE' })
    loadSpots()
  }

  function handleEdit(spot) {
    setEditingSpot(spot)
    setShowEditor(true)
  }

  function handleCreate() {
    setEditingSpot(null)
    setShowEditor(true)
  }

  function handleEditorClose() {
    setShowEditor(false)
    setEditingSpot(null)
    loadSpots()
  }

  async function handleFindImages(selectedOnly = false) {
    if (selectedOnly && selectedIds.size === 0) return
    if (!confirm(`Look up images for ${selectedOnly ? selectedIds.size + ' selected' : 'all spots without'} images?`)) return
    setFindLoading(true)
    setFindResult(null)
    try {
      const body = selectedOnly ? { spotIds: Array.from(selectedIds) } : {}
      const result = await adminFetch('/api/spots/find-images', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setFindResult(result)
      loadSpots()
    } catch (err) {
      setFindResult({ error: err.message })
    } finally {
      setFindLoading(false)
    }
  }

  if (showEditor) {
    return <SpotEditor spot={editingSpot} onClose={handleEditorClose} />
  }

  return (
    <div>
      {/* All Spots */}
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={handleCreate}>+ Create Spot</button>
        <button className="admin-btn" onClick={() => handleFindImages(false)} disabled={findLoading} style={{ marginLeft: 8 }}>
          {findLoading ? 'Searching...' : 'Find Images'}
        </button>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)}>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterPillar} onChange={e => setFilterPillar(e.target.value)}>
          {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {spots.length === 0 ? (
        <p className="admin-empty">No spots found.</p>
      ) : (
        <>
          {selectedIds.size > 0 && (
            <div className="admin-toolbar" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                {selectedIds.size} selected
              </span>
              <button className="admin-btn-sm admin-btn-approve" onClick={() => bulkToggleStatus(true)}>
                Activate All
              </button>
              <button className="admin-btn-sm admin-btn-archive" onClick={() => bulkToggleStatus(false)}>
                Deactivate All
              </button>
              <button className="admin-btn-sm" onClick={() => handleFindImages(true)} disabled={findLoading} style={{ marginLeft: 4 }}>
                Find Images
              </button>
            </div>
          )}
          {findResult && (
            <div style={{ padding: '6px 12px', marginBottom: 8, borderRadius: 4, fontSize: 13, background: findResult.error ? 'rgba(220,50,50,0.1)' : 'rgba(80,180,80,0.1)', color: findResult.error ? '#dc3232' : '#2e7d32' }}>
              {findResult.error ? `Error: ${findResult.error}` : `Found ${findResult.found} image(s), ${findResult.notFound} spot(s) had no results. Updated ${findResult.updated} spot(s).`}
            </div>
          )}

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input
                      type="checkbox"
                      checked={spots.length > 0 && selectedIds.size === spots.length}
                      onChange={selectAll}
                      style={{ accentColor: '#B45F2D' }}
                    />
                  </th>
                  <th style={{ width: 50 }}>Image</th>
                  <th>Name</th>
                  <th>City</th>
                  <th>Pillar</th>
                  <th>Type</th>
                  <th>Tags</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {spots.map(spot => (
                  <tr key={spot._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(spot._id)}
                        onChange={() => toggleSelect(spot._id)}
                        style={{ accentColor: '#B45F2D' }}
                      />
                    </td>
                    <td>
                      {spot.images && spot.images.length > 0 ? (
                        <a href={spot.images[0]} target="_blank" rel="noopener noreferrer">
                          <img src={spot.images[0]} alt="" className="admin-thumb" />
                        </a>
                      ) : (
                        <div className="admin-thumb" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{spot.name}</td>
                    <td>{spot.city}</td>
                    <td>{spot.pillar}</td>
                    <td>{spot.type || '—'}</td>
                    <td style={{ fontSize: 11 }}>{(spot.tags || []).slice(0, 3).join(', ')}{spot.tags?.length > 3 ? '...' : ''}</td>
                    <td>
                      <span className="admin-status-badge" style={{ background: 'rgba(180,95,45,0.1)', color: '#B45F2D', fontSize: 10 }}>
                        {SOURCE_LABELS[spot.source] || spot.source}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`admin-status-badge ${spot.status === 'active' ? 'admin-status-active' : spot.status === 'scraped' ? 'admin-status-scraped' : 'admin-status-inactive'}`}
                        onClick={() => handleToggleStatus(spot)}
                        title="Click to toggle status"
                      >
                        {spot.status}
                      </button>
                    </td>
                    <td>
                      <div className="actions">
                        {spot.status === 'scraped' && (
                          <button className="admin-btn-sm admin-btn-approve" onClick={() => handleApproveSpot(spot._id)}>Approve</button>
                        )}
                        <button className="admin-btn-sm admin-btn-edit" onClick={() => handleEdit(spot)}>Edit</button>
                        <button className="admin-btn-sm admin-btn-delete" onClick={() => handleDelete(spot._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
