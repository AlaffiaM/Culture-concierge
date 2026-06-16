const axios = require('axios')
const unsplash = require('./unsplashImageFinder')

const UA = 'AlaffiaCulturalConcierge/1.0 (agbajestephen5@gmail.com)'
const WIKI_API = 'https://en.wikipedia.org/w/api.php'

async function wikiGet(params) {
  const { data } = await axios.get(WIKI_API, {
    params,
    headers: { 'User-Agent': UA },
    timeout: 10000,
  })
  return data
}

async function searchWikipedia(query) {
  try {
    const search = await wikiGet({
      action: 'query',
      list: 'search',
      srsearch: query,
      format: 'json',
      srlimit: 5,
    })
    return search?.query?.search || []
  } catch {
    return []
  }
}

async function getThumbnail(pageTitle) {
  try {
    const images = await wikiGet({
      action: 'query',
      titles: pageTitle,
      prop: 'pageimages',
      format: 'json',
      pithumbsize: 800,
    })
    return Object.values(images?.query?.pages || {})[0]?.thumbnail?.source || null
  } catch {
    return null
  }
}

async function findImage(venueName, city, pillar, type) {
  // 1. Try Wikipedia first — real venue photos
  const queries = [
    `${venueName} ${city}`,
    venueName,
    venueName.replace(/&/g, 'and'),
    venueName.replace(/'/g, ''),
    venueName.replace(/['’]/g, ''),
  ]

  for (const query of queries) {
    const pages = await searchWikipedia(query)
    for (const page of pages) {
      const thumb = await getThumbnail(page.title)
      if (thumb) return { url: thumb, source: 'wikipedia' }
    }
  }

  // 2. Fallback to Unsplash stock photo
  const unsplashResult = await unsplash.findImage(venueName, pillar, type, city)
  if (unsplashResult) {
    return { url: unsplashResult.url, source: 'unsplash', credit: unsplashResult.credit }
  }

  return null
}

async function findImagesForSpots(spots) {
  const results = []
  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i]

    // Skip if already has a valid image
    if (spot.images && spot.images.length > 0 && spot.images[0] && spot.images[0] !== '') {
      results.push(spot)
      continue
    }

    const result = await findImage(spot.name, spot.city, spot.pillar, spot.type)
    if (result) {
      spot.images = [result.url]
      console.log(`  [finder] ✓ ${spot.name} (${result.source})`)
    } else {
      console.log(`  [finder] ✗ ${spot.name}`)
    }

    results.push(spot)
    if (i < spots.length - 1) await new Promise(r => setTimeout(r, 1500))
  }
  return results
}

module.exports = { findImage, findImagesForSpots }
