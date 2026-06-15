const jwt = require('jsonwebtoken')

const PROJECT_ID = 'alaffia-concierge'
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'

let cachedKeys = null
let cacheExpiry = 0

async function getPublicKeys() {
  if (cachedKeys && Date.now() < cacheExpiry) return cachedKeys
  try {
    const res = await require('axios').get(CERTS_URL, { timeout: 10000 })
    cachedKeys = res.data
    console.log('[verifyToken] Fetched', Object.keys(cachedKeys).length, 'public keys from Google')
    cacheExpiry = Date.now() + 6 * 60 * 60 * 1000
    return cachedKeys
