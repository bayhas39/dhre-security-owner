// Supabase-backed sync for the DHRE dashboard.
//
// Why this exists: localStorage and BroadcastChannel are same-origin only, so
// an owner on a different device could never see admin edits. Supabase gives
// one shared source of truth that every device reads from.
//
// Design rules:
//  1. Never throws, never blocks render. Missing keys or a dead network fall
//     back to the localStorage transport in ./sync.js so the app still works.
//  2. supabase-js is ~226kB, so it is dynamically imported. The dashboard shell
//     and charts must not wait on it.

import { KEYS, publish as publishLocal, readKey as readLocal } from './sync.js'

const url = import.meta.env?.VITE_SUPABASE_URL
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY

export const SUPABASE_ENABLED = Boolean(url && anonKey)

const TABLE = 'dhre_state'
const COLLECTIONS = ['sites', 'incidents', 'accidents']

let clientPromise = null
let realtimeUnsub = null

function getClient() {
  if (!SUPABASE_ENABLED) return Promise.resolve(null)
  if (clientPromise) return clientPromise
  clientPromise = import('@supabase/supabase-js')
    .then(({ createClient }) =>
      createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    )
    .catch((err) => {
      console.warn('[supabase] load failed, using local sync only:', err?.message)
      return null
    })
  return clientPromise
}

/** Warm the client without blocking anything. */
export function primeRemote() {
  if (!SUPABASE_ENABLED) return
  getClient()
}

const toRow = (collection, value) => ({
  collection,
  payload: value,
  rev: Date.now(),
  updated_at: new Date().toISOString(),
})

/**
 * Push a collection to the cloud. Fire-and-forget: localStorage is written
 * first and synchronously, so the current tab never waits on the network.
 */
export function pushRemote(collection, value) {
  if (!SUPABASE_ENABLED) return
  getClient().then(async (client) => {
    if (!client) return
    try {
      const { error } = await client
        .from(TABLE)
        .upsert(toRow(collection, value), { onConflict: 'collection' })
      if (error) console.warn(`[supabase] push ${collection}:`, error.message)
    } catch (err) {
      console.warn(`[supabase] push ${collection} threw:`, err?.message)
    }
  })
}

/**
 * Pull all collections. Returns null when Supabase is unconfigured or the fetch
 * failed, so callers keep their local value instead of blanking the screen.
 */
export function pullAll() {
  if (!SUPABASE_ENABLED) return Promise.resolve(null)
  return getClient().then(async (client) => {
    if (!client) return null
    try {
      const { data, error } = await client.from(TABLE).select('collection,payload,rev')
      if (error) {
        console.warn('[supabase] pull:', error.message)
        return null
      }
      if (!Array.isArray(data) || data.length === 0) return null
      const out = {}
      let highest = 0
      for (const row of data) {
        out[row.collection] = row.payload
        if (typeof row.rev === 'number' && row.rev > highest) highest = row.rev
      }
      return { data: out, rev: highest }
    } catch (err) {
      console.warn('[supabase] pull threw:', err?.message)
      return null
    }
  })
}

/**
 * Subscribe to changes from other devices via Realtime. Returns a synchronous
 * unsubscribe so it can be returned straight from a useEffect cleanup.
 */
export function subscribeRemote(onRemote) {
  if (!SUPABASE_ENABLED) return () => {}

  let cancelled = false
  getClient().then((client) => {
    if (!client || cancelled) return
    try {
      const channel = client
        .channel('dhre-state')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: TABLE },
          (payload) => {
            const row = payload?.new
            if (!row?.collection) return
            onRemote(row.collection, row.payload, row.rev)
          },
        )
        .subscribe()
      realtimeUnsub = () => {
        try {
          client.removeChannel(channel)
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.warn('[supabase] realtime subscribe failed:', err?.message)
    }
  })

  return () => {
    cancelled = true
    if (realtimeUnsub) realtimeUnsub()
    realtimeUnsub = null
  }
}

/**
 * Write to both transports. This is the only publish function App should call.
 * Local first (instant, offline-safe), then cloud (best effort).
 */
export function publishBoth(collection, value, mirrorKey) {
  publishLocal(KEYS[collection] ?? collection, value, mirrorKey)
  pushRemote(collection, value)
}

/** Read the local copy — used as the offline fallback. */
export function readFallback(collection) {
  return readLocal(KEYS[collection] ?? collection, null)
}

export { COLLECTIONS }
