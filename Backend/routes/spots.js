const express = require('express')
const router = express.Router()
const Spot = require('../models/Spot')
const { requireAdmin } = require('../middleware/admin')

const SPOT_SCRAPER_SOURCES = ['gemini']

// GET /api/spots — return active spots (public)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.all === 'true' ? {} : { status: { $in: ['active', 'inactive'] } }
    const spots = await Spot.find(filter).lean().select('name city type pillar vibeTags tags description tip address images coordinates source status')
    res.json(spots)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/spots/:city — return spots for one city (case-insensitive)
router.get('/:city', async (req, res) => {
  try {
    const spots = await Spot.find({
      city: { $regex: req.params.city, $options: 'i' },
      status: { $in: ['active', 'inactive'] },
    }).lean().select('name city type pillar vibeTags tags description tip address images coordinates source status')
    res.json(spots)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/spots/vibes/:city — vibe-matched search
router.get('/vibes/:city', async (req, res) => {
  try {
    const { vibe, q } = req.query
    const filter = {
      city: { $regex: req.params.city, $options: 'i' },
      status: { $in: ['active', 'inactive'] },
    }
    if (vibe) {
      const vibes = vibe.split(',').map(v => new RegExp(v.trim(), 'i'))
      filter.vibeTags = { $in: vibes }
    }
    if (q && q.length >= 2) {
      const text = q.trim()
      filter.$or = [
        { name: { $regex: text, $options: 'i' } },
        { description: { $regex: text, $options: 'i' } },
        { vibeTags: { $regex: text, $options: 'i' } },
      ]
    }
    let spots = await Spot.find(filter).lean()
    if (vibe) {
      const requested = vibe.split(',').map(v => v.trim().toLowerCase())
      spots = spots.map(spot => {
        const matchCount = (spot.vibeTags || []).filter(t =>
          requested.includes(t.toLowerCase())
        ).length
        return { ...spot, vibeScore: matchCount }
      }).sort((a, b) => b.vibeScore - a.vibeScore)
    }
    res.json(spots)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/spots/upcoming/:city — spots that have upcoming approved events
router.get('/upcoming/:city', async (req, res) => {
  try {
    const Event = require('../models/Event')
    const upcomingEventSpotIds = await Event.distinct('linkedSpotId', {
      city: { $regex: req.params.city, $options: 'i' },
      status: 'approved',
      date: { $gte: new Date() },
    })
    const spots = await Spot.find({
      _id: { $in: upcomingEventSpotIds },
      city: { $regex: req.params.city, $options: 'i' },
    })
    res.json(spots)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/spots/find-images — bulk find images for spots with empty images (admin)
router.post('/find-images', requireAdmin, async (req, res) => {
  try {
    const { spotIds } = req.body
    const { findImagesForSpots } = require('../utils/imageFinder')

    let spots
    if (spotIds && Array.isArray(spotIds) && spotIds.length > 0) {
      spots = await Spot.find({ _id: { $in: spotIds } }).lean()
    } else {
      spots = await Spot.find({
        $or: [
          { images: { $exists: false } },
          { images: { $eq: [] } },
        ]
      }).lean()
    }

    if (spots.length === 0) {
      return res.json({ processed: 0, found: 0, notFound: 0, updated: 0 })
    }

    const needImages = spots.filter(s => !s.images || s.images.length === 0)
    const skippedExisting = spots.length - needImages.length

    if (needImages.length === 0) {
      return res.json({ processed: spots.length, found: 0, notFound: 0, updated: 0, skippedExisting })
    }

    const enriched = await findImagesForSpots(needImages)

    let updated = 0
    for (const spot of enriched) {
      if (spot.images && spot.images.length > 0) {
        await Spot.findByIdAndUpdate(spot._id, { images: spot.images })
        updated++
      }
    }

    const foundCount = enriched.filter(s => s.images && s.images.length > 0).length

    res.json({
      processed: spots.length,
      found: foundCount,
      notFound: needImages.length - foundCount,
      updated,
      skippedExisting,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/spots — create a new spot (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const spot = new Spot({
      name: req.body.name,
      city: req.body.city,
      type: req.body.type,
      pillar: req.body.pillar,
      vibeTags: req.body.vibeTags || [],
      tags: req.body.tags || [],
      description: req.body.description,
      tip: req.body.tip,
      address: req.body.address,
      images: req.body.images || [],
      coordinates: req.body.coordinates,
      source: req.body.source || 'manual',
      status: req.body.status || 'active',
    })
    const saved = await spot.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PUT /api/spots/:id — update a spot (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const spot = await Spot.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true })
    if (!spot) return res.status(404).json({ message: 'Spot not found' })
    res.json(spot)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE /api/spots/:id — delete a spot (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const spot = await Spot.findByIdAndDelete(req.params.id)
    if (!spot) return res.status(404).json({ message: 'Spot not found' })
    res.json({ message: 'Spot deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/spots/scraper/run — run a spot scraper (admin)
router.post('/scraper/run', requireAdmin, async (req, res) => {
  try {
    const { source } = req.body
    console.log('[spots] scraper/run called with source:', source)
    if (!source || !SPOT_SCRAPER_SOURCES.includes(source)) {
      return res.status(400).json({ message: `Invalid source. Valid: ${SPOT_SCRAPER_SOURCES.join(', ')}` })
    }

    const scraper = require(`../scrapers/spots-${source}`)
    console.log('[spots] scraper module loaded, running scrape()')
    const scraped = await scraper.scrape()
    console.log('[spots] scrape() returned', scraped.length, 'results')

    const newSpots = []
    for (const data of scraped) {
      const slug = data.name.toLowerCase().trim().slice(0, 60)
      const existing = await Spot.findOne({
        name: { $regex: `^${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' },
        city: data.city,
      })
      if (!existing) {
        const spot = new Spot({
          name: data.name,
          city: data.city,
          type: data.type || 'Venue',
          pillar: data.pillar || 'CULTURE',
          tags: data.tags || [],
          vibeTags: data.vibeTags || [],
          description: data.description || '',
          tip: data.tip || '',
          address: data.address || '',
          images: data.images || [],
          coordinates: data.coordinates || null,
          source: data.source || source,
          status: 'scraped',
        })
        await spot.save()
        newSpots.push(spot)
      }
    }

    res.json({
      source,
      fetched: scraped.length,
      new: newSpots.length,
      skipped: scraped.length - newSpots.length,
      spots: newSpots,
    })
  } catch (err) {
    console.error('[spots] scraper/run error:', err.stack || err)
    res.status(500).json({ message: err.message })
  }
})

// POST /api/spots/scraper/accept — accept scraped spots (admin)
router.post('/scraper/accept', requireAdmin, async (req, res) => {
  try {
    const { spotIds } = req.body
    if (!spotIds || !Array.isArray(spotIds) || spotIds.length === 0) {
      return res.status(400).json({ message: 'spotIds array is required' })
    }

    const result = await Spot.updateMany(
      { _id: { $in: spotIds } },
      { $set: { status: 'inactive' } }
    )

    res.json({ modified: result.modifiedCount })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
