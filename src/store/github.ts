// GitHub Contents API sync layer. Data repo is private; a fine-grained PAT
// (scoped to that one repo) is pasted once in Settings and kept in localStorage.

export interface RepoConfig {
  owner: string
  repo: string
  branch: string
}

export interface QueueItem {
  path: string
  json: string
  message: string
  ts: number
}

const TOKEN_KEY = 'ycb_token'
const REPO_KEY = 'ycb_repo'
const QUEUE_KEY = 'ycb_queue'

export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t.trim())

export function getRepoConfig(): RepoConfig | null {
  try {
    const raw = localStorage.getItem(REPO_KEY)
    return raw ? (JSON.parse(raw) as RepoConfig) : null
  } catch {
    return null
  }
}
export const setRepoConfig = (c: RepoConfig) => localStorage.setItem(REPO_KEY, JSON.stringify(c))

export type SyncStatus =
  | { state: 'off' } // no token configured
  | { state: 'synced' }
  | { state: 'pending'; count: number }
  | { state: 'error'; message: string }

type Listener = (s: SyncStatus) => void
const listeners = new Set<Listener>()
let lastStatus: SyncStatus = { state: 'off' }

export function onSyncStatus(fn: Listener) {
  listeners.add(fn)
  fn(lastStatus)
  return () => void listeners.delete(fn)
}
function emit(s: SyncStatus) {
  lastStatus = s
  listeners.forEach((fn) => fn(s))
}

function getQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') as QueueItem[]
  } catch {
    return []
  }
}
function setQueue(q: QueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
}

/** Queue a JSON file write; newer write to the same path replaces the queued one. */
export function enqueue(path: string, data: unknown, message: string) {
  const q = getQueue().filter((i) => i.path !== path)
  q.push({ path, json: JSON.stringify(data, null, 2), message, ts: Date.now() })
  setQueue(q)
  void flushQueue()
}

const b64encode = (s: string) => {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}
const b64decode = (b: string) => {
  const bin = atob(b.replace(/\n/g, ''))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function gh(path: string, init?: RequestInit): Promise<Response> {
  const cfg = getRepoConfig()
  if (!cfg) throw new Error('no-repo')
  const token = getToken()
  if (!token) throw new Error('no-token')
  return fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers || {}),
    },
  })
}

export async function getFile(path: string): Promise<{ json: unknown; sha: string } | null> {
  const cfg = getRepoConfig()
  const res = await gh(`contents/${path}?ref=${cfg?.branch || 'main'}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  const body = (await res.json()) as { content: string; sha: string }
  return { json: JSON.parse(b64decode(body.content)), sha: body.sha }
}

export async function listDir(path: string): Promise<{ name: string; path: string; type: string }[]> {
  const cfg = getRepoConfig()
  const res = await gh(`contents/${path}?ref=${cfg?.branch || 'main'}`)
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  return (await res.json()) as { name: string; path: string; type: string }[]
}

async function putFile(item: QueueItem): Promise<void> {
  const cfg = getRepoConfig()
  let sha: string | undefined
  const existing = await gh(`contents/${item.path}?ref=${cfg?.branch || 'main'}`)
  if (existing.ok) sha = ((await existing.json()) as { sha: string }).sha
  const res = await gh(`contents/${item.path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: item.message,
      content: b64encode(item.json),
      branch: cfg?.branch || 'main',
      ...(sha ? { sha } : {}),
    }),
  })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('auth')
    throw new Error(`GitHub ${res.status}`)
  }
}

let flushing = false
export async function flushQueue(): Promise<void> {
  if (flushing) return
  const token = getToken()
  const cfg = getRepoConfig()
  if (!token || !cfg) {
    emit({ state: 'off' })
    return
  }
  flushing = true
  try {
    let q = getQueue()
    while (q.length > 0) {
      emit({ state: 'pending', count: q.length })
      try {
        await putFile(q[0])
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg === 'auth') {
          emit({ state: 'error', message: 'Token galat ya expire hai — Angad ko call karo.' })
        } else {
          emit({ state: 'pending', count: q.length })
        }
        return // keep item queued; retry on next flush
      }
      q = getQueue().filter((i) => i.path !== q[0].path || i.ts > q[0].ts)
      setQueue(q)
    }
    emit({ state: 'synced' })
  } finally {
    flushing = false
  }
}

export function startSyncLoop() {
  window.addEventListener('online', () => void flushQueue())
  setInterval(() => void flushQueue(), 60_000)
  void flushQueue()
}

export const pendingCount = () => getQueue().length
