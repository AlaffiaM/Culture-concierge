const axios = require('axios')
const fs = require('fs')
const path = require('path')

const OUTSCRAPER_API = 'https://api.outscraper.com/google-maps-photos'
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'outscraper.json')

function loadApiKey() {
  if (process.env.OUTSCRAPER_API_KEY) return process.env.OUTSCRAPER_API_KEY
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
      if (cfg.apiKey) {
        process.env.OUTSCRAPER_API_KEY = cfg.apiKey
        return cfg.apiKey
      }
    }
  } catch {}
  return ''
}

function getApiKey() {
  return process.env.OUTSCRAPER_API_KEY || ''
}

async function findImage(spotName, city) {
  const apiKey = getApiKey()
  if (!apiKey) return null

  try {
    const { data } = await axios.get(OUTSCRAPER_API, {
      params: { query: `${spotName}, ${city}`, photosLimit: 1, limit: 1, async: false },
      headers: { 'X-API-KEY': apiKey },
      timeout: 15000,
    })
    const photo = data?.data?.[0]?.[0]?.photos_data?.[0]
    return photo?.photo_url_big || photo?.photo_url || null
  } catch {
    return null
  }
}

async function findImagesForSpots(spots) {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.log('  [outscraper] No API key configured — skipping')
    return spots
  }

  const needImages = spots.filter(s => !s.images || s.images.length === 0)
  if (needImages.length === 0) return spots

  const queries = needImages.map(s => `${s.name}, ${s.city}`)

  try {
    const queryStr = queries.map(q => 'query=' + encodeURIComponent(q)).join('&')
    const url = OUTSCRAPER_API + '?' + queryStr + '&photosLimit=1&limit=1&async=false'

    const { data } = await axios.get(url, {
      headers: { 'X-API-KEY': apiKey },
      timeout: 120000,
    })

    const results = data?.data || []
    results.forEach((resultArr, i) => {
      const spot = needImages[i]
      if (!spot) return
      const place = resultArr?.[0]
      const photo = place?.photos_data?.[0]
      if (photo) {
        spot.images = [photo.photo_url_big || photo.photo_url]
        console.log(`  [outscraper] ${spot.name}`)
      } else {
        console.log(`  [outscraper] ${spot.name}`)
      }
    })
  } catch (err) {
    if (err.response?.status === 401) {
      console.error('  [outscraper] Invalid API key')
    } else {
      console.error('  [outscraper] Error:', err.message)
    }
  }

  return needImages
}

// Load persisted key on module init
loadApiKey()

module.exports = { findImage, findImagesForSpots, getApiKey, loadApiKey }
