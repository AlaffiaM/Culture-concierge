import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'
import EventEditor from './EventEditor'

const CITIES = ['All', 'Lagos', 'Abuja', 'Kigali', 'Nairobi']
const PILLARS = ['All', 'CULTURE', 'WELLNESS', 'SOCIAL']
const PAGE_SIZE = 20

const PILLAR_STYLE = {
  CULTURE: { bg: 'rgba(180,95,45,0.15)', color: '#B45F2D' },
  WELLNESS: { bg: 'rgba(138,154,91,0.15)', color: '#8A9A5B' },
  SOCIAL: { bg: 'rgba(91,138,154,0.15)', color: '#5B8A9A' },
}

function vibeStyle(vibe) {
  if (!vibe) return null
  const v = vibe.toLowerCase()
  if (/wellness|nature|retreat|active|fitness|spa|yoga/.test(v))
    return { bg: 'rgba(138,154,91,0.15)', color: '#8A9A5B' }
  if (/culture|creative|intellectual|premium|luxury|high|art|museum/.test(v))
    return { bg: 'rgba(180,95,45,0.15)', color: '#B45F2D' }
  if (/social|night|underground|street|food|workshop|party|vibrant/.test(v))
    return { bg: 'rgba(91,138,154,0.15)', color: '#5B8A9A' }
  return { bg: 'rgba(255,255,255,0.06)', color: '#888' }
}

export default function AdminEvents() {
  const [events, setEvents] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterCity, setFilterCity] = useState('All')
  const [filterPillar, setFilterPillar] = useState('All')
  const [search, setSearch] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [venueExpanded, setVenueExpanded] = useState(new Set())

  function loadEvents() {
    const params = new URLSearchParams({ all: 'true', page, limit: PAGE_SIZE })
    if (filterCity !== 'All') params.set('city', filterCity)
    if (filterPillar !== 'All') params.set('pillar', filterPillar)

    adminFetch(`/api/events?${params}`)
      .then(data => {
        let filtered = data.events || []
        if (search) {
          const q = search.toLowerCase()
          filtered = filtered.filter(e =>
            e.name?.toLowerCase().includes(q) ||
            e.city?.toLowerCase().includes(q)
          )
        }
        setEvents(filtered)
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setSelectedIds(new Set())
      })
      .catch(err => console.error('[AdminEvents]', err.message))
  }

  useEffect(() => { loadEvents() }, [filterStatus, filterCity])

  function selectAll() {
    if (selectedIds.size === events.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(events.map(e => e._id)))
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function bulkApprove() {
    if (!confirm(`Approve ${selectedIds.size} event(s)?`)) return
    for (const id of selectedIds) {
      await adminFetch(`/api/events/${id}/approve`, { method: 'PUT' }).catch(() => {})
    }
    setSelectedIds(new Set())
    loadEvents()
  }

  async function bulkArchive() {
    if (!confirm(`Archive ${selectedIds.size} event(s)?`)) return
    for (const id of selectedIds) {
      await adminFetch(`/api/events/${id}/archive`, { method: 'PUT' }).catch(() => {})
    }
    setSelectedIds(new Set())
    loadEvents()
  }

  async function handleApprove(id) {
    await adminFetch(`/api/events/${id}/approve`, { method: 'PUT' })
    loadEvents()
  }

  async function handleArchive(id) {
    await adminFetch(`/api/events/${id}/archive`, { method: 'PUT' })
    loadEvents()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this event?')) return
    await adminFetch(`/api/events/${id}`, { method: 'DELETE' })
    loadEvents()
  }

  function handleEdit(event) {
    setEditingEvent(event)
    setShowEditor(true)
  }

  function handleCreate() {
    setEditingEvent(null)
    setShowEditor(true)
  }

  function handleEditorClose() {
    setShowEditor(false)
    setEditingEvent(null)
    loadEvents()
  }

  function formatDate(d) {
    if (!d) return '—'
    const date = new Date(d)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (showEditor) {
    return <EventEditor event={editingEvent} onClose={handleEditorClose} />
  }

  return (
    <div>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={handleCreate}>+ Create Event</button>
        {STATUSES.map(s => (
          <button
            key={s}
            className={`admin-btn ${filterStatus === s ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
            onClick={() => setFilterStatus(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)}>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          className="search-input"
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 0, flex: 1, minWidth: 160 }}
        />
      </div>



      {events.length === 0 ? (
        <p className="admin-empty">No events found.</p>
      ) : (
        <>
          {selectedIds.size > 0 && (
            <div className="admin-toolbar" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                {selectedIds.size} selected
              </span>
              <button className="admin-btn-sm admin-btn-approve" onClick={bulkApprove}>
                Approve All
              </button>
              <button className="admin-btn-sm admin-btn-archive" onClick={bulkArchive}>
                Archive All
              </button>
              {filterStatus === 'archived' && (
                <button className="admin-btn-sm admin-btn-approve" onClick={bulkApprove}>
                  Restore All
                </button>
              )}
            </div>
          )}

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input
                      type="checkbox"
                      checked={events.length > 0 && selectedIds.size === events.length}
                      onChange={selectAll}
                      style={{ accentColor: '#B45F2D' }}
                    />
                  </th>
                  <th style={{ width: 50 }}>Image</th>
                  <th>Name</th>
                  <th>Venue</th>
                  <th>Price</th>
                  <th>City</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Vibe</th>
                  <th>Linked To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(event._id)}
                        onChange={() => toggleSelect(event._id)}
                        style={{ accentColor: '#B45F2D' }}
                      />
                    </td>
                    <td>
                      {event.imageUrl ? (
                        <a href={event.imageUrl} target="_blank" rel="noopener noreferrer">
                          <img src={event.imageUrl} alt="" className="admin-thumb" />
                        </a>
                      ) : (
                        <div className="admin-thumb" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{event.name}</td>
                    <td
                      style={{ color: 'var(--admin-text-muted)', fontSize: 12, cursor: event.venue ? 'pointer' : 'default', maxWidth: 160 }}
                      onClick={() => {
                        if (!event.venue) return
                        setVenueExpanded(prev => {
                          const next = new Set(prev)
                          next.has(event._id) ? next.delete(event._id) : next.add(event._id)
                          return next
                        })
                      }}
                      title={venueExpanded.has(event._id) ? '' : event.venue}
                    >
                      {venueExpanded.has(event._id) ? event.venue : (event.venue || '—')}
                    </td>
                    <td style={{ fontSize: 12 }}>{event.price || '—'}</td>
                    <td>{event.city}</td>
                    <td>{formatDate(event.date)}</td>
                    <td>
                      <span className={`admin-status-badge admin-status-${event.status}`}>
                        {event.status}
                        {event.isGhostLocation && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>👻</span>}
                      </span>
                    </td>
                    <td>{event.vibe || '—'}</td>
                    <td>{event.linkedSpotId?.name || (event.isGhostLocation ? 'Pop-up' : '—')}</td>
                    <td>
                      <div className="actions">
                        {event.status === 'draft' && (
                          <button className="admin-btn-sm admin-btn-approve" onClick={() => handleApprove(event._id)}>Approve</button>
                        )}
                        {event.status !== 'archived' ? (
                          <button className="admin-btn-sm admin-btn-archive" onClick={() => handleArchive(event._id)}>Archive</button>
                        ) : (
                          <button className="admin-btn-sm admin-btn-approve" onClick={() => handleApprove(event._id)}>Restore</button>
                        )}
                        <button className="admin-btn-sm admin-btn-edit" onClick={() => handleEdit(event)}>Edit</button>
                        <button className="admin-btn-sm admin-btn-delete" onClick={() => handleDelete(event._id)}>Delete</button>
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
