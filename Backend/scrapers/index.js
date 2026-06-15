const Event = require('../models/Event')

const CITY_COORDS = {
  Lagos: { lat: 6.5244, lng: 3.3792 },
  Abuja: { lat: 9.0765, lng: 7.3986 },
  Kigali: { lat: -1.9441, lng: 30.0619 },
  Nairobi: { lat: -1.2921, lng: 36.8219 },
}

async function deduplicate(events) {
  const unique = []
  const seen = new Set()
  for (const ev of events) {
    const key = `${ev.name.toLowerCase().trim().slice(0, 60)}|${ev.date?.toISOString?.()?.slice(0, 10) || ''}|${ev.city}`
    if (seen.has(key)) continue
    seen.add(key)
    const slug = ev.name.toLowerCase().trim().slice(0, 60)
    const existing = await Event.findOne({
      name: { $regex: `^${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' },
      date: ev.date,
      city: ev.city,
    })
    if (!existing) unique.push(ev)
  }
  return unique
}

async function runScrapers(sources) {
  const results = {}
  const allNew = []

  for (const source of sources) {
    try {
      const scraper = require(`./${source}`)
      const scraped = await scraper.scrape()
      const unique = await deduplicate(scraped)

      for (const ev of unique) {
        const coords = ev.coordinates || CITY_COORDS[ev.city] || CITY_COORDS.Nairobi
        const event = new Event({
          name: ev.name,
          city: ev.city,
          date: ev.date,
          description: ev.description || '',
          imageUrl: ev.imageUrl || '',
          pillar: ev.pillar || 'CULTURE',
          type: ev.type || '',
          venue: ev.venue || '',
          source: ev.source || source,
          status: 'scraped',
          isGhostLocation: true,
          coordinates: coords,
          tags: [source],
          time: ev.time || '',
        })
        await event.save()
        allNew.push(event)
      }

      results[source] = {
        fetched: scraped.length,
        new: unique.length,
        skipped: scraped.length - unique.length,
      }
    } catch (err) {
      results[source] = { fetched: 0, new: 0, skipped: 0, error: err.message }
    }
  }

  return { results, events: allNew, total: allNew.length }
}

module.exports = { runScrapers }
