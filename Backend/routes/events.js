const express = require('express')
const router = express.Router()
const Event = require('../models/Event')

// GET /api/events — list approved events, filterable by city
router.get('/', async (req, res) => {
  try {
    const filter = { status: 'approved' }
    if (req.query.city) {
      filter.city = { $regex: req.query.city, $options: 'i' }
    }
    const events = await Event.find(filter).sort({ date: 1 }).populate('linkedSpotId', 'name type')
    res.json(events)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/events/upcoming — approved events happening today or later
router.get('/upcoming', async (req, res) => {
  try {
    const filter = {
      status: 'approved',
      date: { $gte: new Date() },
    }
    if (req.query.city) {
      filter.city = { $regex: req.query.city, $options: 'i' }
    }
    const events = await Event.find(filter).sort({ date: 1 }).limit(20).populate('linkedSpotId', 'name type')
    res.json(events)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/events/scraped — all scraped events (for scraper browse)
router.get('/scraped', async (req, res) => {
  try {
    const events = await Event.find({ status: 'scraped' }).sort({ createdAt: -1 })
    res.json(events)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/events/ghosts — all ghost events (pop-ups, no fixed venue)
router.get('/ghosts', async (req, res) => {
  try {
    const filter = { isGhostLocation: true }
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status
    }
    const events = await Event.find(filter).sort({ date: -1 }).populate('linkedSpotId', 'name type')
    res.json(events)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/events/pending — review queue (all draft/pending events)
router.get('/pending', async (req, res) => {
  try {
    const events = await Event.find({ status: 'draft' }).sort({ createdAt: -1 }).populate('linkedSpotId', 'name type')
    res.json(events)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/events/today — events happening today in a city (for "Live Tonight" badge)
router.get('/today', async (req, res) => {
  try {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    const filter = {
      status: 'approved',
      date: { $gte: start, $lte: end },
    }
    if (req.query.city) {
      filter.city = { $regex: req.query.city, $options: 'i' }
    }
    const events = await Event.find(filter).populate('linkedSpotId', 'name type')
    res.json(events)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/events/:id — single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('linkedSpotId', 'name type details')
    if (!event) return res.status(404).json({ message: 'Event not found' })
    res.json(event)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/events — create event (defaults to draft)
router.post('/', async (req, res) => {
  try {
    const event = new Event({
      name: req.body.name,
      city: req.body.city,
      coordinates: req.body.coordinates,
      linkedSpotId: req.body.linkedSpotId || null,
      date: req.body.date,
      endDate: req.body.endDate,
      time: req.body.time,
      type: req.body.type,
      pillar: req.body.pillar,
      tags: req.body.tags || [],
      vibe: req.body.vibe,
      description: req.body.description,
      tip: req.body.tip,
      imageUrl: req.body.imageUrl,
      isGhostLocation: req.body.isGhostLocation || false,
      source: req.body.source || 'manual',
      status: 'draft',
    })
    const saved = await event.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PUT /api/events/:id — update event fields
router.put('/:id', async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!event) return res.status(404).json({ message: 'Event not found' })
    res.json(event)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PUT /api/events/:id/approve — set status to approved
router.put('/:id/approve', async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { returnDocument: 'after' }
    )
    if (!event) return res.status(404).json({ message: 'Event not found' })
    res.json(event)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PUT /api/events/:id/archive — set status to archived
router.put('/:id/archive', async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { returnDocument: 'after' }
    )
    if (!event) return res.status(404).json({ message: 'Event not found' })
    res.json(event)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE /api/events/:id
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id)
    if (!event) return res.status(404).json({ message: 'Event not found' })
    res.json({ message: 'Event deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
