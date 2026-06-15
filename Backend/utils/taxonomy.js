const CATEGORIES = [
  { name: 'Wellness', tags: ['Mindfulness', 'Yoga', 'Sound Healing', 'Meditation', 'Spa', 'Holistic', 'Self-Care', 'Reset', 'Wellness Journey'] },
  { name: 'Art & Creativity', tags: ['Sip and Paint', 'Gallery Opening', 'Exhibition', 'Fine Art', 'Curated', 'Artisan', 'Vernissage', 'Creative Hub'] },
  { name: 'Dining', tags: ['Gastronomy', 'Tasting Menu', "Chef's Table", 'Farm-to-Table', 'Brunch', 'Fine Dining', 'Culinary Art', 'Foodie'] },
  { name: 'Music (Intimate)', tags: ['Jazz Session', 'Acoustic', 'Unplugged', 'Vinyl Night', 'Soul', 'Lounge', 'Sundowner', 'Speakeasy', 'Afro-Jazz'] },
  { name: 'Cultural & Arts', tags: ['Theatre', 'Play', 'Performance', 'Heritage', 'Festival', 'Folklore', 'Stage Play', 'Roots'] },
  { name: 'Niche/Outdoors', tags: ['Birdwatching', 'Pottery', 'Day Retreat', 'Workshop', 'Nature Walk', 'Eco-Tourism', 'Hidden Gems', 'Craft Class'] },
]

const REGIONAL_SLANG = [
  { region: 'Lagos', tags: ['#SoftLife', '#Detty', '#Gbedu', '#Owambe', '#Outside', '#PremiumDining', '#EkoGlam', '#Vawulence'] },
  { region: 'Nairobi', tags: ['#ThePlot', '#Sundowner', '#Sherehe', '#Form', '#NyamaChoma', '#VibeYa254', '#Kutano'] },
  { region: 'Kigali', tags: ['#Cuvée', '#Inshuti', '#Scenic', '#MadeInRwanda', '#KigaliLife', '#Degustation'] },
  { region: 'Global', tags: ['#Birdwatching', '#Pottery', '#SipAndPaint', '#IntimateMusic', '#PopUp', '#SecretLocation'] },
]

const SIBLING_MAP = {
  birdwatching: { category: 'Outdoors', suggestion: 'Nature Retreat' },
  pottery: { category: 'Workshop', suggestion: 'Craft Class' },
  '#Birdwatching': { category: 'Outdoors', suggestion: 'Nature Retreat' },
  '#Pottery': { category: 'Workshop', suggestion: 'Craft Class' },
}

function getCategoryForTag(tag) {
  const lower = tag.toLowerCase()
  for (const cat of CATEGORIES) {
    if (cat.tags.some(t => t.toLowerCase() === lower)) return cat.name
  }
  return null
}

function getSiblingFallback(tag) {
  const key = SIBLING_MAP[tag] || SIBLING_MAP[tag.toLowerCase()]
  if (key) return key
  const category = getCategoryForTag(tag)
  if (category) {
    const cat = CATEGORIES.find(c => c.name === category)
    const siblings = cat.tags.filter(t => t.toLowerCase() !== tag.toLowerCase())
    return siblings.length > 0 ? { category, suggestion: siblings[0] } : null
  }
  return null
}

function getAllTags() {
  const tags = new Set()
  for (const cat of CATEGORIES) cat.tags.forEach(t => tags.add(t))
  for (const reg of REGIONAL_SLANG) reg.tags.forEach(t => tags.add(t))
  return [...tags].sort()
}

module.exports = { CATEGORIES, REGIONAL_SLANG, SIBLING_MAP, getCategoryForTag, getSiblingFallback, getAllTags }
