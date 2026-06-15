const axios = require('axios')

const UA = 'AlaffiaCulturalConcierge/1.0 (agbajestephen5@gmail.com)'
const WIKI_API = 'https://en.wikipedia.org/w/api.php'

async function wikiGet(params) {
  const { data } = await axios.get(WIKI_API, {
    params,
    headers: { 'User-Agent': UA },
    timeout: 8000,
  })
  return data
}

async function searchWikipedia(venueName, city) {
  try {
    const search = await wikiGet({
      action: 'query',
      list: 'search',
      srsearch: `${venueName} ${city}`,
      format: 'json',
      srlimit: 5,
    })

    const pages = search?.query?.search
    if (!pages || pages.length === 0) return null

    for (const page of pages) {
      const images = await wikiGet({
        action: 'query',
        titles: page.title,
        prop: 'pageimages',
        format: 'json',
        pithumbsize: 800,
      })

      const thumb = Object.values(images?.query?.pages || {})[0]?.thumbnail?.source
      if (thumb) return thumb
    }
  } catch {
    return null
  }
  return null
}

async function findImage(venueName, city, retries = 1) {
  for (let i = 0; i <= retries; i++) {
    const url = await searchWikipedia(venueName, city)
    if (url) return url
    if (i < retries) await new Promise(r => setTimeout(r, 2000))
  }
  return null
}

async function findImagesForSpots(spots) {
  const results = []
  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i]
    if (spot.images && spot.images.length > 0) {
      results.push(spot)
      continue
    }

    const imageUrl = await findImage(spot.name, spot.city)
    if (imageUrl) {
      spot.images = [imageUrl]
      console.log(`  [finder] ✓ ${spot.name}`)
    } else {
      console.log(`  [finder] ✗ ${spot.name}`)
    }

    results.push(spot)
    if (i < spots.length - 1) await new Promise(r => setTimeout(r, 600))
  }
  return results
}

module.exports = { findImage, findImagesForSpots }
