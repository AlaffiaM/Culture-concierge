const mongoose = require('mongoose')

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  linkedSpotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Spot', default: null },
  date: { type: Date, required: true },
  endDate: Date,
  time: String,
  type: String,
  pillar: { type: String, enum: ['CULTURE', 'WELLNESS', 'SOCIAL'] },
  tags: [String],
  vibe: String,
  description: String,
  tip: String,
  imageUrl: String,
  status: { type: String, enum: ['scraped', 'draft', 'approved', 'archived'], default: 'draft' },
  isGhostLocation: { type: Boolean, default: false },
  source: { type: String, default: 'manual' },
}, { timestamps: true })

module.exports = mongoose.model('Event', eventSchema)
