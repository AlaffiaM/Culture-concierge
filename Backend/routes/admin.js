const express = require('express')
const router = express.Router()
const { requireAdmin } = require('../middleware/admin')
const Event = require('../models/Event')
const Spot = require('../models/Spot')

// All admin routes require authentication
router.use(requireAdmin)

// GET /api/admin/stats — dashboard analytics
router.get('/stats', async (req, res) => {
  try {
    const [totalEvents, draftEvents, approvedEvents, archivedEvents, totalSpots, ghosts, eventsByCity] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: 'draft' }),
      Event.countDocuments({ status: 'approved' }),
      Event.countDocuments({ status: 'archived' }),
      Spot.countDocuments(),
      Event.countDocuments({ isGhostLocation: true }),
      Event.aggregate([
        { $group: { _id: '$city', count: { $sum: 1 } } },
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

    const spotsByCity = await Spot.aggregate([
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    res.json({
      totalEvents,
      draftEvents,
      approvedEvents,
      archivedEvents,
      totalSpots,
      ghostEvents: ghosts,
      eventsThisWeek,
      eventsByCity: eventsByCity.map(c => ({ city: c._id, count: c.count })),
      spotsByCity: spotsByCity.map(c => ({ city: c._id, count: c.count })),
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/admin/tags — list all unique tags across events
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

// POST /api/admin/tags — reserved for future structured tag management
router.post('/tags', async (req, res) => {
  res.json({ message: 'Structured tag management coming in Phase 2' })
})

// GET /api/admin/outscraper-status — check Outscraper API key configuration
router.get('/outscraper-status', (req, res) => {
  const { getApiKey } = require('../utils/outscraperImageFinder')
  const key = getApiKey()
  res.json({
    configured: !!key,
    keyPreview: key ? key.slice(0, 8) + '...' : null,
  })
})

// POST /api/admin/outscraper-key — update Outscraper API key
router.post('/outscraper-key', (req, res) => {
  const { apiKey } = req.body
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ message: 'apiKey string is required' })
  }

  const fs = require('fs')
  const path = require('path')
  const configDir = path.join(__dirname, '..', 'config')
  const configPath = path.join(configDir, 'outscraper.json')

  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify({ apiKey }, null, 2))
  process.env.OUTSCRAPER_API_KEY = apiKey

  res.json({ message: 'API key updated', keyPreview: apiKey.slice(0, 8) + '...' })
})

module.exports = router
