// Unified sync layer for DHRE dashboard.
// Single source of truth in localStorage, coordinated by a revision counter so we
// never need to JSON.stringify 80 sites just to detect a change.
//
// Transport matrix (what actually works):
//   - same origin, different tab  -> `storage` event  (free, no polling)
//   - same origin, same tab       -> BroadcastChannel
//   - different origin / device   -> NOT POSSIBLE without a backend
//
// The `storage` event is the key win: it replaces the old 800ms + 1500ms
// polling loops that were re-serialising every site on every tick.

const KEYS = {
  sites: 'site-inspection-sites-v80',
  sitesLegacy: 'site-inspection-sites',
  incidents: 'site-inspection-incidents',
  accidents: 'dhre-accidents',
}

const REV = 'dhre-rev'
const CHANNEL = 'dhre-sync'

const canStorage = (() => {
  try {
    const k = '__dhre_probe__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
})()

let bc = null
function getChannel() {
  if (bc !== null) return bc
  try {
    bc = new BroadcastChannel(CHANNEL)
  } catch {
    bc = false
  }
  return bc
}

export function readKey(key, fallback) {
  if (!canStorage) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function readRev() {
  if (!canStorage) return 0
  const n = Number(window.localStorage.getItem(REV))
  return Number.isFinite(n) ? n : 0
}

function bumpRev() {
  const next = readRev() + 1
  try {
    if (canStorage) window.localStorage.setItem(REV, String(next))
  } catch {
    /* quota / private mode - sync degrades to in-tab only */
  }
  return next
}

/**
 * Persist a slice and notify every other same-origin context.
 * `mirror` lets us keep the legacy key in step without a second write path.
 */
export function publish(key, value, mirrorKey) {
  const rev = bumpRev()
  if (canStorage) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
      if (mirrorKey) window.localStorage.setItem(mirrorKey, JSON.stringify(value))
    } catch {
      /* ignore - best effort */
    }
  }
  const channel = getChannel()
  if (channel) {
    try {
      channel.postMessage({ type: 'update', key, rev })
    } catch {
      /* ignore */
    }
  }
  return rev
}

/**
 * Subscribe to remote changes for the given keys.
 *
 * `storage` is the primary transport: it fires in every *other* same-origin tab
 * when localStorage changes, which removes the need for any polling. We key off
 * the REV counter so a single write produces exactly one notification.
 *
 * BroadcastChannel is a secondary path. It never echoes to the posting context,
 * so no self-write filtering is needed there.
 */
export function subscribe(keys, onRemote) {
  const watched = new Set(keys)

  // Cross-tab, same origin. Native and event-driven.
  const onStorage = (e) => {
    if (e.key !== REV) return
    for (const k of watched) onRemote(k)
  }
  window.addEventListener('storage', onStorage)

  const channel = getChannel()
  if (channel) {
    channel.onmessage = (e) => {
      const d = e?.data
      if (!d || d.type !== 'update') return
      onRemote(watched.has(d.key) ? d.key : '*')
    }
  }

  return () => {
    window.removeEventListener('storage', onStorage)
    if (channel) channel.onmessage = null
  }
}

/** Seed legacy key from the canonical one so old builds keep working. */
export function ensureLegacyMirror(sites) {
  if (!canStorage || !Array.isArray(sites)) return
  try {
    const legacy = window.localStorage.getItem(KEYS.sitesLegacy)
    if (legacy == null) window.localStorage.setItem(KEYS.sitesLegacy, JSON.stringify(sites))
  } catch {
    /* ignore */
  }
}

export { KEYS }
