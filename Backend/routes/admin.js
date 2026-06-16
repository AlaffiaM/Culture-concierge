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

module.exports = router
