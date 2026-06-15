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
  } catch (err) {
    console.error('[verifyToken] Failed to fetch Google public keys:', err.message)
    // If we have stale keys, use them as fallback
    if (cachedKeys) {
      console.log('[verifyToken] Using stale cached keys as fallback')
      return cachedKeys
    }
    throw { code: 'auth/key-fetch-failed', message: `Failed to fetch public keys: ${err.message}` }
  }
}

async function verifyFirebaseToken(token) {
  const decoded = jwt.decode(token, { complete: true })
  if (!decoded || !decoded.header || !decoded.header.kid) {
    console.error('[verifyToken] Failed to decode token or missing kid')
    throw { code: 'auth/invalid-token', message: 'Invalid token format' }
  }

  console.log('[verifyToken] Token decoded: kid=' + decoded.header.kid + ', alg=' + decoded.header.alg)

  const keys = await getPublicKeys()
  const publicKey = keys[decoded.header.kid]
  if (!publicKey) {
    console.error('[verifyToken] Key ID not found in Google public keys. Available kids:', Object.keys(keys))
    throw { code: 'auth/invalid-token', message: 'Invalid key ID' }
  }

  console.log('[verifyToken] Found matching public key, verifying...')
  try {
    const payload = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      audience: PROJECT_ID,
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    })
    console.log('[verifyToken] JWT verified successfully for:', payload.email)
    if (!payload.email || !payload.email_verified) {
      console.error('[verifyToken] Email not verified:', payload.email, payload.email_verified)
      throw { code: 'auth/email-not-verified', message: 'Email not verified' }
    }
    return payload
  } catch (err) {
    console.error('[verifyToken] JWT verify failed:', err.name, err.message)
    throw err
  }
}

module.exports = { verifyFirebaseToken, PROJECT_ID }
