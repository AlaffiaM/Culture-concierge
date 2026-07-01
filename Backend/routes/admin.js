const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { requireAdmin } = require('../middleware/admin')
const Event = require('../models/Event')
const Spot = require('../models/Spot')

router.use(requireAdmin)

const CITY_ALIASES = {
  'NAIROBI': 'Nairobi',
  'FCT': 'Abuja',
  'Federal Capital Territory': 'Abuja',
  'Jabi Abuja': 'Abuja',
}

function normalizeCities(items) {
  const map = {}
  for (const { city, count } of items) {
    const key = CITY_ALIASES[city] || city
    map[key] = (map[key] || 0) + count
  }
  return Object.entries(map)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
}

// ---------- Dashboard Stats ----------

router.get('/stats', async (req, res) => {
  try {
    const [totalEvents, approvedEvents, totalSpots, ghosts, eventsByCity, spotsByCity, eventsByPillar, spotsByPillar] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: 'approved' }),
      Spot.countDocuments(),
      Event.countDocuments({ isGhostLocation: true }),
      Event.aggregate([
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Spot.aggregate([
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Event.aggregate([
        { $match: { pillar: { $exists: true, $ne: '' } } },
        { $group: { _id: { $toUpper: '$pillar' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Spot.aggregate([
        { $match: { pillar: { $exists: true, $ne: '' } } },
        { $group: { _id: { $toUpper: '$pillar' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ])

    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 7)

    const eventsThisWeek = await Event.countDocuments({
      status: 'approved',
      date: { $gte: startOfWeek, $lt: endOfWeek },
    })

    const pillarMap = {}
    for (const { _id, count } of [...eventsByPillar, ...spotsByPillar]) {
      pillarMap[_id] = (pillarMap[_id] || 0) + count
    }
    const pillarBreakdown = Object.entries(pillarMap)
      .map(([pillar, count]) => ({ pillar, count }))
      .sort((a, b) => b.count - a.count)

    res.json({
      totalEvents,
      approvedEvents,
      totalSpots,
      ghostEvents: ghosts,
      eventsThisWeek,
      eventsByCity: normalizeCities(eventsByCity.map(c => ({ city: c._id, count: c.count }))),
      spotsByCity: normalizeCities(spotsByCity.map(c => ({ city: c._id, count: c.count }))),
      pillarBreakdown,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ---------- Tags / Vibe Tags ----------

router.get('/tags', async (req, res) => {
  try {
    const allTags = await Event.distinct('tags')
    const allVibeTags = await Spot.distinct('vibeTags')
    const unique = [...new Set([...allTags, ...allVibeTags])].sort()
    res.json(unique)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/tags', async (req, res) => {
  res.json({ message: 'Structured tag management coming in Phase 2' })
})

router.get('/vibe-tags', async (req, res) => {
  try {
    const [eventTags, spotTags] = await Promise.all([
      Event.distinct('tags'),
      Spot.distinct('vibeTags'),
    ])
    const all = [...new Set([...eventTags, ...spotTags])].filter(Boolean).sort()
    res.json(all)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ---------- System Health ----------

const startTime = Date.now()

router.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected'

    const lastScrapedEvent = await Event.findOne({ source: { $in: ['ticketsasa', 'kenyabuzz', 'mookh', 'eventbrite', 'gemini'] } })
      .sort({ createdAt: -1 })
      .select('createdAt source')
      .lean()

    const eventCount = await Event.countDocuments()
    const spotCount = await Spot.countDocuments()

    res.json({
      database: dbStatus,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      lastScraperRun: lastScrapedEvent?.createdAt || null,
      lastScraperSource: lastScrapedEvent?.source || null,
      geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
      firebaseConfigured: true,
      eventCount,
      spotCount,
      nodeVersion: process.version,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ---------- Team / Admin List ----------

router.get('/team', async (req, res) => {
  try {
    const emails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)

    res.json(emails.map((email, i) => ({
      email,
      role: i === 0 ? 'Owner' : 'Admin',
      added: 'Via ADMIN_EMAILS env',
    })))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ---------- CSV Export ----------

router.get('/export/events', async (req, res) => {
  try {
    const events = await Event.find({}).lean().sort({ createdAt: -1 })
    const fields = ['name', 'city', 'venue', 'price', 'date', 'pillar', 'vibe', 'status', 'source', 'type', 'createdAt']
    let csv = fields.join(',') + '\n'
    for (const ev of events) {
      csv += fields.map(f => `"${(ev[f] !== undefined && ev[f] !== null ? String(ev[f]) : '').replace(/"/g, '""')}"`).join(',') + '\n'
    }
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=events-export.csv')
    res.send(csv)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/export/spots', async (req, res) => {
  try {
    const spots = await Spot.find({}).lean().sort({ createdAt: -1 })
    const fields = ['name', 'city', 'type', 'pillar', 'source', 'status', 'address', 'createdAt']
    let csv = fields.join(',') + '\n'
    for (const s of spots) {
      csv += fields.map(f => `"${(s[f] !== undefined && s[f] !== null ? String(s[f]) : '').replace(/"/g, '""')}"`).join(',') + '\n'
    }
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=spots-export.csv')
    res.send(csv)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ---------- Danger Zone: Clear Scraped Events ----------

router.delete('/scraped-events', async (req, res) => {
  try {
    const result = await Event.deleteMany({
      source: { $in: ['ticketsasa', 'kenyabuzz', 'mookh', 'eventbrite'] },
    })
    res.json({ deleted: result.deletedCount })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
