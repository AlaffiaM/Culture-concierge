import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'
import EventEditor from './EventEditor'

const STATUSES = ['all', 'approved']
const CITIES = ['All', 'Lagos', 'Abuja', 'Kigali', 'Nairobi']

export default function AdminGhostEvents() {
  const [events, setEvents] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCity, setFilterCity] = useState('All')
  const [search, setSearch] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [venueExpanded, setVenueExpanded] = useState(new Set())
  const [detailEvent, setDetailEvent] = useState(null)

  function loadEvents() {
    let url = '/api/events/ghosts'
    if (filterStatus !== 'all') url += `?status=${filterStatus}`
    adminFetch(url)
      .then(data => {
        let filtered = data
        if (filterCity !== 'All') {
          filtered = filtered.filter(e => e.city?.toLowerCase() === filterCity.toLowerCase())
        }
        if (search) {
          const q = search.toLowerCase()
          filtered = filtered.filter(e =>
            e.name?.toLowerCase().includes(q) ||
            e.city?.toLowerCase().includes(q) ||
            e.venue?.toLowerCase().includes(q)
          )
        }
        setEvents(filtered)
      })
      .catch(err => console.error('[AdminGhostEvents]', err.message))
  }

  useEffect(() => { loadEvents() }, [filterStatus, filterCity])

  async function handleDelete(id) {
    if (!confirm('Delete this ghost event?')) return
    await adminFetch(`/api/events/${id}`, { method: 'DELETE' })
    setDetailEvent(null)
    loadEvents()
  }

  function handleEdit(event) {
    setEditingEvent(event)
    setShowEditor(true)
  }

  function handleEditorClose() {
    setShowEditor(false)
    setEditingEvent(null)
    loadEvents()
  }

  function handleRowClick(event) {
    if (!event._id) return
    setDetailEvent(event)
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
        <span className="admin-section-title" style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text)', marginRight: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          👻 Ghost Events
        </span>
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
          placeholder="Search ghost events..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 0, flex: 1, minWidth: 160 }}
        />
      </div>



      {events.length === 0 ? (
        <p className="admin-empty">No ghost events found.</p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
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
                  <tr
                    key={event._id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleRowClick(event)}
                  >
                    <td onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(event._id)}
                        onChange={() => toggleSelect(event._id)}
                        style={{ accentColor: '#B45F2D' }}
                      />
                    </td>
                    <td>
                      {event.imageUrl ? (
                        <a href={event.imageUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                          <img src={event.imageUrl} alt="" className="admin-thumb" />
                        </a>
                      ) : (
                        <div className="admin-thumb" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{event.name}</td>
                    <td
                      style={{ color: 'var(--admin-text-muted)', fontSize: 12, cursor: event.venue ? 'pointer' : 'default', maxWidth: 160 }}
                      onClick={e => {
                        e.stopPropagation()
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
                      </span>
                    </td>
                    <td>{event.vibe || '—'}</td>
                    <td>{event.linkedSpotId?.name || 'Pop-up'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="actions">
                        {event.status === 'draft' && (
                          <button className="admin-btn-sm admin-btn-approve" onClick={() => handleApprove(event._id)}>Approve</button>
                        )}
                        {event.status !== 'archived' && (
                          <button className="admin-btn-sm admin-btn-archive" onClick={() => handleArchive(event._id)}>Archive</button>
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

      {/* Detail Modal */}
      {detailEvent && (
        <div className="admin-overlay" onClick={() => setDetailEvent(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <button className="admin-modal-close" onClick={() => setDetailEvent(null)}>✕</button>

            {/* Hero Image */}
            {detailEvent.imageUrl ? (
              <a href={detailEvent.imageUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={detailEvent.imageUrl}
                  alt=""
                  style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 8, marginBottom: 20 }}
                />
              </a>
            ) : (
              <div style={{ width: '100%', height: 180, borderRadius: 8, background: 'rgba(255,255,255,0.04)', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)', fontSize: 13 }}>
                No image
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--admin-text)' }}>{detailEvent.name}</h3>
                <span className={`admin-status-badge admin-status-${detailEvent.status}`} style={{ marginTop: 8, display: 'inline-block' }}>
                  {detailEvent.status} 👻
                </span>
              </div>
              <div className="actions" style={{ gap: 6 }}>
                {detailEvent.status === 'draft' && (
                  <button className="admin-btn-sm admin-btn-approve" onClick={() => handleApprove(detailEvent._id)}>Approve</button>
                )}
                {detailEvent.status !== 'archived' && (
                  <button className="admin-btn-sm admin-btn-archive" onClick={() => handleArchive(detailEvent._id)}>Archive</button>
                )}
                <button className="admin-btn-sm admin-btn-edit" onClick={() => handleEdit(detailEvent)}>Edit</button>
                <button className="admin-btn-sm admin-btn-delete" onClick={() => handleDelete(detailEvent._id)}>Delete</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, color: 'var(--admin-text)' }}>
              <div>
                <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Date</span>
                {formatDate(detailEvent.date)}
              </div>
              <div>
                <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Time</span>
                {detailEvent.time || '—'}
              </div>
              <div>
                <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>City</span>
                {detailEvent.city}
              </div>
              <div>
                <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Price</span>
                {detailEvent.price || '—'}
              </div>
              <div>
                <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Venue</span>
                {detailEvent.venue || '—'}
              </div>
              <div>
                <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Pillar</span>
                {detailEvent.pillar || '—'}
              </div>
              <div>
                <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Vibe</span>
                {detailEvent.vibe || '—'}
              </div>
              <div>
                <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Source</span>
                {detailEvent.source || '—'}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11 }}>Linked Spot</span>
                {detailEvent.linkedSpotId?.name || 'Pop-up (ghost)'}
              </div>
            </div>

            {detailEvent.description && (
              <div style={{ marginTop: 16 }}>
                <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11, marginBottom: 4 }}>Description</span>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--admin-text)' }}>{detailEvent.description}</p>
              </div>
            )}

            {detailEvent.tip && (
              <div style={{ marginTop: 12 }}>
                <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: 11, marginBottom: 4 }}>Tip</span>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--admin-text)' }}>{detailEvent.tip}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
