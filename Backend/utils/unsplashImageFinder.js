const axios = require('axios')

const UNSPLASH_API = 'https://api.unsplash.com/search/photos'

const PILLAR_KEYWORDS = {
  CULTURE: ['museum', 'art gallery', 'cultural centre', 'monument', 'theatre', 'landmark'],
  WELLNESS: ['spa', 'wellness resort', 'meditation', 'yoga retreat', 'massage'],
  SOCIAL: ['restaurant', 'cafe', 'nightlife', 'jazz club', 'market', 'bar'],
}

function getApiKey() {
  return process.env.UNSPLASH_ACCESS_KEY || ''
}

function buildQueries(spotName, pillar, type, city) {
  const pillarKeywords = PILLAR_KEYWORDS[pillar] || ['travel', 'destination']
  const typeWords = (type || '').toLowerCase()

  return [
    typeWords ? `${typeWords} ${city}` : null,
    `${city} ${pillarKeywords[0]}`,
    `${pillarKeywords[0]} ${city}`,
    pillarKeywords[0],
    `${city}`,
    `${city} travel`,
    `${city} landmark`,
    'africa travel',
  ].filter(Boolean)
}

async function findImage(spotName, pillar, type, city) {
  const apiKey = getApiKey()
  if (!apiKey) return null

  const queries = buildQueries(spotName, pillar, type, city)
  const seen = new Set()

  for (const query of queries) {
    if (seen.has(query)) continue
    seen.add(query)

    try {
      const { data } = await axios.get(UNSPLASH_API, {
        params: { query, per_page: 1, orientation: 'landscape' },
        headers: { Authorization: `Client-ID ${apiKey}` },
        timeout: 8000,
      })

      const photo = data?.results?.[0]
      if (photo) {
        return {
          url: photo.urls?.regular || photo.urls?.small,
          credit: { name: photo.user?.name, link: photo.links?.html },
          alt: photo.alt_description || query,
        }
      }
    } catch {
      // Try next query
    }
  }

  return null
}

module.exports = { findImage, getApiKey }
