// Vercel-backed sync for the DHRE owner portal.
//
// Talks to the main dashboard's /api/sync Serverless Function (Vercel KV backed)
// so edits made here appear on the main dashboard (and vice versa) automatically.
// Falls back to localStorage-only behaviour if the request fails.

const API = 'https://test-1-blond-tau.vercel.app/api/sync'

export const SUPABASE_ENABLED = true

const COLLECTIONS = ['sites', 'incidents', 'accidents']
export { COLLECTIONS }

const KEYS = {
  sites: 'site-inspection-sites-v80',
  sitesLegacy: 'site-inspection-sites',
  incidents: 'site-inspection-incidents',
  accidents: 'dhre-accidents',
}

const revByCol = {}

export function primeRemote() {
  // Intentionally lightweight: the API client is just fetch, nothing to warm.
}

async function fetchCol(col) {
  const resp = await fetch(`${API}?collection=${encodeURIComponent(col)}`)
  if (!resp.ok) throw new Error(String(resp.status))
  return resp.json().catch(() => null)
}

export async function pullAll() {
  try {
    const out = { data: {} }
    let highest = 0
    for (const c of COLLECTIONS) {
      const row = await fetchCol(c)
      if (row && row.payload !== undefined) {
        out.data[c] = row.payload
        if (typeof row.rev === 'number' && row.rev > highest) highest = row.rev
        revByCol[c] = row.rev
      }
    }
    if (Object.keys(out.data).length === 0) return null
    out.rev = highest
    return out
  } catch {
    return null
  }
}

async function pushRemote(collection, value) {
  try {
    const resp = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, payload: value }),
    })
    const j = await resp.json().catch(() => null)
    if (j && typeof j.rev === 'number') revByCol[collection] = j.rev
  } catch {
    /* offline-safe: data is already in localStorage */
  }
}

// Keep the same localStorage write + legacy mirror that sync.js used to provide,
// then push to the shared server without re-importing.
import { publish as publishLocal } from './sync.js'

export function publishBoth(collection, value, mirrorKey) {
  try { publishLocal(KEYS[collection] ?? collection, value, mirrorKey) } catch { /* ignore */ }
  pushRemote(collection, value)
}

export function subscribeRemote(onRemote) {
  const timer = setInterval(async () => {
    for (const c of COLLECTIONS) {
      try {
        const resp = await fetch(`${API}?collection=${encodeURIComponent(c)}`)
        if (!resp.ok) continue
        const row = await resp.json().catch(() => null)
        if (!row || row.payload === undefined || typeof row.rev !== 'number') continue
        if (revByCol[c] !== undefined && row.rev <= revByCol[c]) continue
        revByCol[c] = row.rev
        onRemote(c, row.payload, row.rev)
      } catch {
        /* offline */
      }
    }
  }, 7000)
  return () => clearInterval(timer)
}
