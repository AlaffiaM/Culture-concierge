import './ItineraryView.css'

function parseItinerary(text) {
  if (!text) return null

  const lines = text.split('\n')
  const pulse = lines
    .find((l) => /^\*?Daily Pulse/i.test(l.trim()))
    ?.replace(/^\*|\*$/g, '')
    .trim() || ''

  const days = []
  let currentDay = null
  let currentSlot = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (/^\*\*Day \d/.test(line)) {
      if (currentDay) days.push(currentDay)
      currentDay = { title: line.replace(/\*\*/g, ''), slots: [] }
      currentSlot = null
      continue
    }

    if (/^\*10|11|12|1|2|3|4|5|6|7|8|9/.test(line) && /\*—/.test(line)) {
      if (currentSlot && currentDay) currentDay.slots.push(currentSlot)
      const content = line.replace(/^\*|\*$/g, '')
      const sep = content.indexOf('—') !== -1 ? '—' : (content.indexOf('-') !== -1 ? '-' : null)
      const parts = sep ? content.split(sep).map((s) => s.trim()) : [content]
      currentSlot = {
        time: parts[0] || '',
        name: parts[1] || content,
        description: '',
        tip: '',
      }
      continue
    }

    if (/^\*Tip/i.test(line)) {
      if (currentSlot) {
        currentSlot.tip = line.replace(/^\*Tip:\s*\*?\s*/i, '').replace(/\*$/, '')
      }
      continue
    }

    if (currentSlot && !currentSlot.description && !/^-{3,}$/.test(line) && !/^\*Daily Pulse/i.test(line) && !/^\*\*Day \d/.test(line) && !/^\*10|11|12|1|2|3|4|5|6|7|8|9/.test(line)) {
      currentSlot.description = line
    }
  }

  if (currentSlot && currentDay) currentDay.slots.push(currentSlot)
  if (currentDay) days.push(currentDay)

  return { pulse, days }
}

function ItineraryView({ itinerary, city, onBack }) {
  const parsed = parseItinerary(itinerary)

  if (!parsed || parsed.days.length === 0) {
    return (
      <div className="iv">
        <div className="iv-empty">
          <p>Could not parse itinerary. Here is the raw text:</p>
          <pre className="iv-raw">{itinerary}</pre>
          <button className="btn btn-primary btn-full" onClick={onBack}>
            Back to spots
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="iv">
      <div className="iv-header">
        <h2 className="section-title">Your {city} Plan</h2>
        {parsed.pulse && <p className="iv-pulse">{parsed.pulse}</p>}
      </div>

      {parsed.days.map((day, i) => (
        <div key={i} className="iv-day">
          <div className="iv-day-header">
            <span className="iv-day-number">Day {i + 1}</span>
            <h3 className="iv-day-title">{day.title.replace(`Day ${i + 1} — `, '')}</h3>
          </div>
          <div className="iv-cards">
            {day.slots.map((slot, j) => (
              <div key={j} className="iv-card">
                <div className="iv-card-time-row">
                  <span className="iv-card-dot" />
                  <span className="iv-card-time">{slot.time}</span>
                </div>
                <div className="iv-card-body">
                  <h4 className="iv-card-name">{slot.name}</h4>
                  {slot.description && (
                    <p className="iv-card-desc">{slot.description}</p>
                  )}
                  {slot.tip && (
                    <div className="iv-card-tip">
                      <span className="tip-icon">Tip</span>
                      {slot.tip}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {i < parsed.days.length - 1 && (
            <div className="iv-day-divider">
              <span className="iv-day-divider-line" />
              <span className="iv-day-divider-icon">✦</span>
              <span className="iv-day-divider-line" />
            </div>
          )}
        </div>
      ))}

      <button className="btn btn-primary btn-full" onClick={onBack}>
        Back to spots
      </button>
    </div>
  )
}

export default ItineraryView
