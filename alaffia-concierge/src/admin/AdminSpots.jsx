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
        let filtered = data.spots || []
        if (filterPillar !== 'All') {
          filtered = filtered.filter(s => s.pillar === filterPillar)
        }
        if (search) {
          const q = search.toLowerCase()
          filtered = filtered.filter(s =>
            s.name?.toLowerCase().includes(q) ||
            s.city?.toLowerCase().includes(q) ||
            (s.tags || []).some(t => t.toLowerCase().includes(q))
          )
        }
        setSpots(filtered)
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setSelectedIds(new Set())
      })
      .catch(err => console.error('[AdminSpots]', err.message))
  }

  useEffect(() => { loadSpots() }, [filterCity, filterPillar, page])

  function goToPage(p) {
    if (p >= 1 && p <= totalPages) setPage(p)
  }

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

  function Pagination() {
    if (totalPages <= 1) return null
    const from = (page - 1) * PAGE_SIZE + 1
    const to = Math.min(page * PAGE_SIZE, total)
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) pages.push(i)

    return (
      <div className="pagination-bar">
        <span className="pagination-info">Showing {from}–{to} of {total}</span>
        <div className="pagination-controls">
          <button className="pagination-btn" disabled={page <= 1} onClick={() => goToPage(page - 1)}>‹</button>
          {start > 1 && <><button className="pagination-btn" onClick={() => goToPage(1)}>1</button><span className="pagination-ellipsis">…</span></>}
          {pages.map(p => <button key={p} className={`pagination-btn ${p === page ? 'pagination-active' : ''}`} onClick={() => goToPage(p)}>{p}</button>)}
          {end < totalPages && <><span className="pagination-ellipsis">…</span><button className="pagination-btn" onClick={() => goToPage(totalPages)}>{totalPages}</button></>}
          <button className="pagination-btn" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>›</button>
        </div>
      </div>
    )
  }

  if (showEditor) {
    return <SpotEditor spot={editingSpot} onClose={handleEditorClose} />
  }

  return (
    <div>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={handleCreate}>+ Create Spot</button>
        <button className="admin-btn" onClick={() => handleFindImages(false)} disabled={findLoading}>
          {findLoading ? 'Searching...' : 'Find Images'}
        </button>
        <select value={filterCity} onChange={e => { setFilterCity(e.target.value); setPage(1) }}>
          <option value="All">All Cities</option>
          {CITIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterPillar} onChange={e => { setFilterPillar(e.target.value); setPage(1) }}>
          {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input
          className="search-input"
          type="text"
          placeholder="Search spots..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 0, flex: 1, minWidth: 160 }}
        />
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
              <button className="admin-btn-sm" onClick={() => handleFindImages(true)} disabled={findLoading}>
                Find Images
              </button>
            </div>
          )}
          {findResult && (
            <div style={{ padding: '6px 12px', marginBottom: 8, borderRadius: 4, fontSize: 13, background: findResult.error ? 'rgba(220,50,50,0.1)' : 'rgba(80,180,80,0.1)', color: findResult.error ? '#dc3232' : '#2e7d32' }}>
              {findResult.error ? `Error: ${findResult.error}` : `Found ${findResult.found} image(s), ${findResult.notFound} spot(s) had no results. Updated ${findResult.updated} spot(s).`}
            </div>
          )}

          <Pagination />

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
                  <th>Last Updated</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {spots.map(spot => {
                  const src = sourceStyle(spot.source)
                  return (
                    <tr key={spot._id} className="spots-hover-row">
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
